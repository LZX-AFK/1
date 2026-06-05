const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 小叶统计
 * 返回 totalLeaves / todayLeaves / weeklyDays / records / nextBadge
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
    const userRes = await db.collection('users').where({ openid }).get()
    const user = userRes.data[0] || {}

    const totalLeaves = user.leafTotal || 0

    // 今日小叶数
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${d}`

    const todayMealsRes = await db.collection('meals')
      .where({ openid, record_date: todayStr })
      .count()
    const todayLeaves = todayMealsRes.total || 0

    // 本周活跃天数
    const weeklyActiveDates = user.weeklyActiveDates || []
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartDate = weekStart.toISOString().slice(0, 10)
    const thisWeekDates = weeklyActiveDates.filter(d => d >= weekStartDate)
    const weeklyDays = thisWeekDates.length

    // 最近记录
    const recentRes = await db.collection('user_daily_stats')
      .where({ openid })
      .orderBy('date', 'desc')
      .limit(7)
      .get()

    const records = (recentRes.data || []).map(r => ({
      date: r.date,
      leavesEarned: r.leaves_earned || r.leavesEarned || 0,
      mealCount: r.meal_count || r.mealCount || 0
    }))

    // 下一个徽章
    const badges = [
      { name: '初尝滋味', need: 1, key: 'firstMeal' },
      { name: '小食客', need: 10, key: 'tenMeals' },
      { name: '美食家', need: 50, key: 'fiftyMeals' },
      { name: '三日坚持', need: 3, key: 'threeDayStreak', type: 'streak' },
      { name: '一周达人', need: 7, key: 'weeklyStreak', type: 'streak' },
      { name: '习惯养成', need: 21, key: 'threeWeekStreak', type: 'streak' },
    ]

    const streakDays = user.streakDays || 0
    let nextBadgeName = ''
    let nextBadgeNeed = 0
    let nextBadgeCurrent = 0

    for (const b of badges) {
      const current = b.type === 'streak' ? streakDays : totalLeaves
      if (current < b.need) {
        nextBadgeName = b.name
        nextBadgeNeed = b.need
        nextBadgeCurrent = current
        break
      }
    }

    return {
      success: true,
      data: {
        totalLeaves,
        todayLeaves,
        weeklyDays,
        records,
        nextBadgeName,
        nextBadgeNeed,
        nextBadgeCurrent
      }
    }
  } catch (err) {
    console.error('获取小叶统计失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取小叶统计失败',
      data: null
    }
  }
}
