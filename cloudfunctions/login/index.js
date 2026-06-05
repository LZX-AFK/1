const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 微信小程序登录云函数
 * 不需要前端传 code/openid，通过云开发上下文自动获取
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { userInfo = {} } = event

  if (!openid) {
    return {
      success: false,
      errorCode: 'AUTH_FAILED',
      errorMessage: '获取 openid 失败',
      data: null
    }
  }

  try {
    const userResult = await db
      .collection('users')
      .where({ openid })
      .get()

    let isNewUser = false
    let userData = {}

    if (userResult.data.length === 0) {
      isNewUser = true
      const newUser = {
        openid,
        nickname: userInfo.nickName || '团团食记用户',
        avatarUrl: userInfo.avatarUrl || '',
        gender: '',
        age: 0,
        height: 0,
        weight: 0,
        targetWeight: 0,
        bodyFatRate: 0,
        goal: '',
        activityLevel: 'sedentary',
        calorieTarget: 0,
        budget: 0,
        dietaryPreference: [],
        leafTotal: 0,
        weeklyActiveDays: 0,
        weeklyActiveDates: [],
        streakDays: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }

      const createResult = await db
        .collection('users')
        .add({ data: newUser })

      userData = { ...newUser, _id: createResult._id }
    } else {
      const existing = userResult.data[0]
      const updateData = { updatedAt: db.serverDate() }
      if (userInfo.nickName) updateData.nickname = userInfo.nickName
      if (userInfo.avatarUrl) updateData.avatarUrl = userInfo.avatarUrl

      await db.collection('users').doc(existing._id).update({ data: updateData })
      userData = { ...existing, ...updateData }

      const activeDates = existing.weeklyActiveDates || []
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekStartDate = weekStart.toISOString().slice(0, 10)
      const thisWeekActiveDates = activeDates.filter(d => d >= weekStartDate)
      userData.weeklyActiveDays = thisWeekActiveDates.length
      userData.weeklyActiveDates = thisWeekActiveDates
    }

    return {
      success: true,
      data: {
        openid,
        isNew: isNewUser,
        leafTotal: userData.leafTotal || 0,
        weeklyActiveDays: userData.weeklyActiveDays || 0,
        weeklyActiveDates: userData.weeklyActiveDates || [],
        user: {
          _id: userData._id,
          nickname: userData.nickname,
          avatarUrl: userData.avatarUrl || '',
          streakDays: userData.streakDays || 0,
          createdAt: userData.createdAt
        }
      }
    }
  } catch (err) {
    console.error('登录失败:', err)
    return {
      success: false,
      errorCode: 'LOGIN_ERROR',
      errorMessage: err.message || '登录失败',
      data: null
    }
  }
}
