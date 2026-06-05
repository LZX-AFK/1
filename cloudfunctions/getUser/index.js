const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 获取用户资料
 * 返回 camelCase 字段
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
    const result = await db
      .collection('users')
      .where({ openid })
      .get()

    if (result.data.length === 0) {
      return {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        errorMessage: '用户不存在',
        data: null
      }
    }

    const raw = result.data[0]

    // 计算本周活跃天数
    const activeDates = raw.weeklyActiveDates || []
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartDate = weekStart.toISOString().slice(0, 10)
    const thisWeekActiveDates = activeDates.filter(d => d >= weekStartDate)

    // 构建 camelCase 用户对象
    const user = {
      _id: raw._id,
      nickname: raw.nickname || '团团食记用户',
      avatarUrl: raw.avatarUrl || '',
      gender: raw.gender || '',
      age: raw.age || 0,
      height: raw.height || 0,
      weight: raw.weight || 0,
      targetWeight: raw.targetWeight || 0,
      bodyFatRate: raw.bodyFatRate || 0,
      goal: raw.goal || '',
      activityLevel: raw.activityLevel || 'sedentary',
      calorieTarget: raw.calorieTarget || 0,
      budget: raw.budget || 0,
      dietaryPreference: raw.dietaryPreference || [],
      leafTotal: raw.leafTotal || 0,
      weeklyActiveDays: thisWeekActiveDates.length,
      weeklyActiveDates: thisWeekActiveDates,
      streakDays: raw.streakDays || 0,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    }

    return {
      success: true,
      data: user
    }
  } catch (err) {
    console.error('获取用户资料失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取用户资料失败',
      data: null
    }
  }
}
