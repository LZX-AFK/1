const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 月视图饮食记录
 * @param {number} year
 * @param {number} month
 */
exports.main = async (event, context) => {
  const { year, month } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!year || !month) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: '缺少年份或月份参数',
      data: null
    }
  }

  if (!openid) {
    return {
      success: false,
      errorCode: 'AUTH_FAILED',
      errorMessage: '用户未登录',
      data: null
    }
  }

  try {
    const monthStr = String(month).padStart(2, '0')
    const datePrefix = `${year}-${monthStr}`

    const result = await db
      .collection('meals')
      .where({
        openid,
        record_date: db.RegExp({ regexp: `^${datePrefix}`, options: 'i' })
      })
      .orderBy('record_date', 'asc')
      .orderBy('created_at', 'asc')
      .get()

    const meals = result.data || []

    // 按日期分组
    const dateMap = new Map()
    meals.forEach(meal => {
      const date = meal.record_date
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          hasMeal: true,
          coverImage: meal.skin_url || meal.skinUrl || meal.image_url || meal.imageUrl || '',
          totalCalories: meal.calories || 0,
          totalPrice: meal.price || 0,
          leavesGained: 1,
          mealCount: 1
        })
      } else {
        const entry = dateMap.get(date)
        entry.totalCalories += meal.calories || 0
        entry.totalPrice += meal.price || 0
        entry.leavesGained += 1
        entry.mealCount += 1
      }
    })

    // round 数值
    const dates = Array.from(dateMap.values()).map(d => ({
      ...d,
      totalCalories: Math.round(d.totalCalories),
      totalPrice: parseFloat(d.totalPrice.toFixed(2))
    }))

    return {
      success: true,
      data: { year, month, dates }
    }
  } catch (err) {
    console.error('获取月度饮食记录失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取月度饮食记录失败',
      data: null
    }
  }
}
