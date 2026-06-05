const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// ============ UUID 生成 ============

function generateMealId() {
  return 'meal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
}

// ============ 小叶奖励逻辑 ============

async function rewardLeaf(openid, mealId) {
  try {
    // 今日已记录餐次数
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    const todayMeals = await db.collection('meals').where({
      openid,
      recordDate: todayStr
    }).count()

    // 每记录一餐 +1 小叶
    const leafReward = 1

    // 更新 users 表累计小叶
    await db.collection('users').where({ openid }).update({
      data: {
        leafTotal: _.inc(leafReward),
        updatedAt: db.serverDate()
      }
    })

    // 记录小叶解锁日志
    await db.collection('leaf_unlocks').add({
      data: {
        openid,
        unlockType: 'meal_record',
        mealId,
        leafCount: leafReward,
        unlockedAt: db.serverDate()
      }
    })

    // 更新本周陪伴天数（去重：同一天多次记录只算 1 天）
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }

    // 查询本周有记录的天数
    const weeklyRecords = await db.collection('meals').where({
      openid,
      recordDate: _.in(weekDates)
    }).field({ recordDate: true }).get()

    const uniqueDays = new Set(weeklyRecords.data.map(m => m.recordDate))
    const weeklyActiveDays = uniqueDays.size

    // 更新用户本周活跃天数
    await db.collection('users').where({ openid }).update({
      data: { weeklyActiveDays }
    })

    // 更新 user_daily_stats
    const existingStats = await db.collection('user_daily_stats').where({
      openid,
      date: todayStr
    }).get()

    if (existingStats.data.length > 0) {
      await db.collection('user_daily_stats').doc(existingStats.data[0]._id).update({
        data: {
          mealCount: _.inc(1),
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 新的一天，计算连续天数
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

      const yesterdayStats = await db.collection('user_daily_stats').where({
        openid,
        date: yesterdayStr
      }).get()

      const continuousDays = yesterdayStats.data.length > 0
        ? (yesterdayStats.data[0].continuousDays || 0) + 1
        : 1

      await db.collection('user_daily_stats').add({
        data: {
          openid,
          date: todayStr,
          mealCount: 1,
          totalCalories: 0,
          totalPrice: 0,
          continuousDays,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    }

    return { success: true, leafReward, weeklyActiveDays }
  } catch (err) {
    console.warn('小叶奖励失败（不阻塞主流程）:', err.message)
    return { success: false, leafReward: 0, error: err.message }
  }
}

// ============ 衣柜解锁检测 ============

async function checkSkinUnlock(openid, category, foodName) {
  try {
    if (!category || category === 'other') {
      return { isNew: false }
    }

    const existing = await db.collection('skins').where({
      openid,
      foodCategory: category
    }).get()

    if (existing.data.length > 0) {
      return { isNew: false }
    }

    // 查预生成图库
    const skinCat = await db.collection('skin_categories').where({
      categoryKey: category
    }).get()

    let skinUrl = null
    let skinName = `${foodName}小人`

    if (skinCat.data.length > 0 && skinCat.data[0].defaultSkinUrl) {
      skinUrl = skinCat.data[0].defaultSkinUrl
      skinName = skinCat.data[0].displayName || skinName
    }

    // 写入 skins 表
    await db.collection('skins').add({
      data: {
        openid,
        foodCategory: category,
        skinUrl,
        skinName,
        unlockedAt: db.serverDate()
      }
    })

    return { isNew: true, skinUrl, skinName }
  } catch (err) {
    console.warn('衣柜解锁检测失败:', err.message)
    return { isNew: false, error: err.message }
  }
}

// ============ 防重复提交 ============

const recentSubmissions = new Map() // 临时内存去重（云函数实例级别）

function isDuplicate(openid, foodName, calories) {
  const key = `${openid}_${foodName}_${calories}`
  const now = Date.now()
  if (recentSubmissions.has(key) && now - recentSubmissions.get(key) < 5000) {
    return true
  }
  recentSubmissions.set(key, now)
  // 清理过期记录
  if (recentSubmissions.size > 1000) {
    for (const [k, v] of recentSubmissions) {
      if (now - v > 10000) recentSubmissions.delete(k)
    }
  }
  return false
}

// ============ 主函数 ============

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errorCode: 'NOT_LOGGED_IN', errorMessage: '用户未登录', data: null }
  }

  const {
    foodName, calories, price, category, mealType,
    imageFileID, imageUrl, nutrition,
    dialogue, mealDate, portion, skinUrl, skinName
  } = event

  // 必填校验
  if (!foodName) {
    return { success: false, errorCode: 'MISSING_FOOD_NAME', errorMessage: '缺少食物名称', data: null }
  }

  // 防重复提交
  if (isDuplicate(openid, foodName, calories)) {
    return { success: false, errorCode: 'DUPLICATE', errorMessage: '请勿重复提交', data: null }
  }

  try {
    const mealId = generateMealId()
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const recordDate = mealDate || `${year}-${month}-${day}`

    // 构建 meal 记录
    const mealData = {
      mealId,
      openid,
      foodName,
      calories: calories || null,
      price: price || 0,
      category: category || 'other',
      mealType: mealType || null, // breakfast/lunch/dinner/snack
      imageFileID: imageFileID || null,
      imageUrl: imageUrl || null,
      fatRatio: nutrition?.fatRatio || null,
      proteinRatio: nutrition?.proteinRatio || null,
      carbRatio: nutrition?.carbRatio || null,
      portion: portion || 'medium',
      skinUrl: skinUrl || null,
      skinName: skinName || null,
      dialogue: dialogue || null,
      recordDate,
      createdAt: db.serverDate()
    }

    // 写入 meals 表
    await db.collection('meals').add({ data: mealData })

    // 并行：小叶奖励 + 衣柜解锁检测（不阻塞主流程）
    const [leafResult, unlockResult] = await Promise.allSettled([
      rewardLeaf(openid, mealId),
      checkSkinUnlock(openid, category, foodName)
    ])

    const leafReward = leafResult.status === 'fulfilled' ? leafResult.value : { success: false, leafReward: 0 }
    const unlock = unlockResult.status === 'fulfilled' ? unlockResult.value : { isNew: false }

    // 获取当前连续记录天数
    let currentStreak = 0
    let streakUpdated = false
    try {
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const d = String(today.getDate()).padStart(2, '0')
      const todayStr = `${y}-${m}-${d}`
      const statsRes = await db.collection('user_daily_stats').where({ openid, date: todayStr }).get()
      if (statsRes.data.length > 0) {
        currentStreak = statsRes.data[0].continuousDays || 0
        streakUpdated = true
      }
    } catch (streakErr) {
      console.warn('获取连续天数失败:', streakErr.message)
    }

    return {
      success: true,
      data: {
        mealId,
        leafReward: leafReward.leafReward || 0,
        unlockResult: {
          isNew: unlock.isNew || false,
          skinUrl: unlock.skinUrl || null,
          skinName: unlock.skinName || null
        },
        streakUpdated,
        currentStreak
      }
    }
  } catch (err) {
    console.error('addMeal 失败:', err)
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: err.message || '保存失败',
      data: null
    }
  }
}
