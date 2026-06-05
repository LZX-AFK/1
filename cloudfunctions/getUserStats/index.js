const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 用户统计信息
 * 返回 totalMeals / leafTotal / weeklyDays / foodFriends / badges / streakDays / activeDays
 */
exports.main = async (event, context) => {
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
    // 取用户信息
    const userRes = await db.collection('users').where({ openid }).get()
    const user = userRes.data[0] || {}

    // 取所有 daily stats
    const statsRes = await db
      .collection('user_daily_stats')
      .where({ openid })
      .orderBy('date', 'desc')
      .get()

    const stats = statsRes.data || []

    const totalRecords = stats.length
    const totalMeals = stats.reduce((sum, r) => sum + (r.meal_count || r.mealCount || 0), 0)
    const streakDays = stats[0]?.continuous_days || stats[0]?.streakDays || user.streakDays || 0
    const activeDays = totalRecords
    const leafTotal = user.leafTotal || 0

    // 本周活跃天数
    const weeklyActiveDates = user.weeklyActiveDates || []
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartDate = weekStart.toISOString().slice(0, 10)
    const weeklyDays = weeklyActiveDates.filter(d => d >= weekStartDate).length

    // 食物朋友数 = 已解锁皮肤数
    let foodFriends = 0
    try {
      const skinsRes = await db.collection('skins').where({ openid }).count()
      foodFriends = skinsRes.total || 0
    } catch (e) { /* skins 表可能不存在 */ }

    // badges 计算
    const badges = []
    if (totalMeals >= 1) badges.push('firstMeal')
    if (totalMeals >= 10) badges.push('tenMeals')
    if (totalMeals >= 50) badges.push('fiftyMeals')
    if (streakDays >= 3) badges.push('threeDayStreak')
    if (streakDays >= 7) badges.push('weeklyStreak')
    if (streakDays >= 21) badges.push('threeWeekStreak')
    if (foodFriends >= 5) badges.push('fiveFriends')
    if (foodFriends >= 10) badges.push('tenFriends')

    return {
      success: true,
      data: {
        totalMeals,
        foodFriends,
        badges,
        leafTotal,
        weeklyDays,
        streakDays,
        activeDays
      }
    }
  } catch (err) {
    console.error('获取用户统计失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取用户统计失败',
      data: {
        totalMeals: 0,
        foodFriends: 0,
        badges: [],
        leafTotal: 0,
        weeklyDays: 0,
        streakDays: 0,
        activeDays: 0
      }
    }
  }
}
