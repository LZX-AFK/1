const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 统计概览（周/月维度）
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
exports.main = async (event, context) => {
  const { startDate, endDate } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      errorCode: 'AUTH_FAILED',
      errorMessage: '用户未登录',
      data: null
    }
  }

  try {
    const where = { openid }
    if (startDate && endDate) {
      where.record_date = db.command.and([
        db.command.gte(startDate),
        db.command.lte(endDate)
      ])
    }

    const result = await db.collection('meals').where(where).get()
    const meals = result.data || []

    let totalCalories = 0
    let totalLeaves = 0
    const mealTypeMap = {}
    const dateSet = new Set()

    meals.forEach(m => {
      totalCalories += m.calories || 0
      dateSet.add(m.record_date)
      const mt = m.mealType || 'unknown'
      mealTypeMap[mt] = (mealTypeMap[mt] || 0) + 1
    })

    const days = dateSet.size || 1

    return {
      success: true,
      data: {
        weeklyCalories: Math.round(totalCalories),
        weeklyMeals: meals.length,
        weeklyLeaves: meals.length,
        avgCaloriesPerDay: Math.round(totalCalories / days),
        mealTypeDistribution: mealTypeMap
      }
    }
  } catch (err) {
    console.error('获取统计概览失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取统计概览失败',
      data: null
    }
  }
}
