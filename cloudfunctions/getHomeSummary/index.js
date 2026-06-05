const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errorCode: 'NOT_LOGGED_IN', errorMessage: '用户未登录', data: null }
  }

  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    // 并行查询 5 个数据源
    const [userRes, todayMealsRes, leafRes, latestMealRes, weeklyStatsRes] = await Promise.all([
      // 1. 用户资料
      db.collection('users').where({ openid }).get(),
      // 2. 今日 meals
      db.collection('meals').where({ openid, record_date: todayStr }).orderBy('created_at', 'asc').get(),
      // 3. 小叶统计
      db.collection('leaf_unlocks').where({ openid }).count(),
      // 4. 最近一条 meal（用于底部面板）
      db.collection('meals').where({ openid }).orderBy('created_at', 'desc').limit(1).get(),
      // 5. 本周统计
      getWeeklyStats(openid, today)
    ])

    const user = userRes.data[0] || {}
    const meals = todayMealsRes.data || []

    // 今日汇总
    let totalCalories = 0
    let totalPrice = 0
    meals.forEach(m => {
      totalCalories += m.calories || 0
      totalPrice += m.price || 0
    })

    // 确定首页状态
    let homeState = 'empty'
    if (meals.length > 0) {
      homeState = 'active'
    }

    return {
      success: true,
      data: {
        // 用户信息
        user: {
          nickname: user.nickname || '食愈小伙伴',
          avatarUrl: user.avatarUrl || user.avatar_url || '',
          calorieTarget: user.calorieTarget || user.calorie_target || 1500,
          goal: user.goal || 'lose_fat',
          leafTotal: user.leafTotal || user.leaf_total || 0,
          weeklyActiveDays: user.weeklyActiveDays || user.weekly_active_days || 0
        },
        // 今日汇总
        todaySummary: {
          date: todayStr,
          totalCalories: Math.round(totalCalories),
          totalPrice: parseFloat(totalPrice.toFixed(2)),
          mealCount: meals.length,
          calorieTarget: user.calorieTarget || user.calorie_target || 1500,
          progressPercent: Math.min(100, Math.round(totalCalories / (user.calorieTarget || user.calorie_target || 1500) * 100))
        },
        // 今日餐次列表
        todayMeals: meals.map(m => ({
          mealId: m.mealId || m._id,
          foodName: m.foodName || m.food_name,
          calories: m.calories,
          price: m.price,
          category: m.category,
          mealType: m.mealType || m.meal_type,
          imageUrl: m.imageUrl || m.image_url,
          skinUrl: m.skinUrl || m.skin_url,
          createdAt: m.createdAt || m.created_at
        })),
        // 小叶数据
        leafStats: {
          totalLeaves: user.leafTotal || user.leaf_total || 0,
          todayLeaves: meals.length, // 每记录一餐 +1
          weeklyDays: weeklyStatsRes.activeDays || 0,
          weeklyTarget: 5
        },
        // 最近一条记录
        latestMeal: latestMealRes.data[0] ? {
          foodName: latestMealRes.data[0].foodName || latestMealRes.data[0].food_name,
          skinUrl: latestMealRes.data[0].skinUrl || latestMealRes.data[0].skin_url,
          dialogue: latestMealRes.data[0].dialogue
        } : null,
        // 首页状态
        homeState
      }
    }
  } catch (err) {
    console.error('getHomeSummary 失败:', err)
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: err.message || '获取首页数据失败',
      data: null
    }
  }
}

// ============ 本周统计辅助 ============

async function getWeeklyStats(openid, today) {
  try {
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }

    const statsRes = await db.collection('user_daily_stats').where({
      openid,
      date: db.command.in(weekDates)
    }).get()

    return {
      activeDays: statsRes.data.length,
      totalMeals: statsRes.data.reduce((sum, s) => sum + (s.mealCount || 0), 0),
      totalCalories: statsRes.data.reduce((sum, s) => sum + (s.totalCalories || 0), 0)
    }
  } catch (err) {
    console.warn('getWeeklyStats 失败:', err.message)
    return { activeDays: 0, totalMeals: 0, totalCalories: 0 }
  }
}
