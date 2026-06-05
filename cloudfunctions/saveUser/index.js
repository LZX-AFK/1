const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
}

const GOAL_ADJUSTMENT = {
  lose_fat: -300,
  gain_muscle: 200,
  maintain: 0
}

function calculateBMR(gender, weight, height, age) {
  if (gender === 'male') {
    return 66 + (13.7 * weight) + (5 * height) - (6.8 * age)
  }
  return 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age)
}

function calculateTDEE(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY_MULTIPLIER[activityLevel] || 1.2))
}

function calculateCalorieTarget(tdee, goal) {
  return tdee + (GOAL_ADJUSTMENT[goal] || 0)
}

/**
 * 保存/更新用户资料
 * 入参和出参全部 camelCase
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

  const userData = event

  // 必填字段校验
  const requiredFields = ['gender', 'age', 'height', 'weight', 'goal', 'activityLevel']
  const missingFields = requiredFields.filter(f => !userData[f])
  if (missingFields.length > 0) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: `缺少必填字段: ${missingFields.join(', ')}`,
      data: null
    }
  }

  try {
    const bmr = calculateBMR(userData.gender, userData.weight, userData.height, userData.age)
    const tdee = calculateTDEE(bmr, userData.activityLevel)
    const calorieTarget = userData.calorieTarget > 0
      ? userData.calorieTarget
      : calculateCalorieTarget(tdee, userData.goal)

    const saveData = {
      nickname: userData.nickname,
      avatarUrl: userData.avatarUrl,
      gender: userData.gender,
      age: userData.age,
      height: userData.height,
      weight: userData.weight,
      targetWeight: userData.targetWeight || 0,
      bodyFatRate: userData.bodyFatRate || 0,
      goal: userData.goal,
      activityLevel: userData.activityLevel,
      calorieTarget: calorieTarget,
      budget: userData.budget || 0,
      dietaryPreference: userData.dietaryPreference || [],
      updatedAt: db.serverDate(),
      bmr: Math.round(bmr),
      tdee: tdee
    }

    const existResult = await db
      .collection('users')
      .where({ openid })
      .get()

    let isNew = false

    if (existResult.data.length > 0) {
      await db.collection('users').doc(existResult.data[0]._id).update({ data: saveData })
    } else {
      isNew = true
      saveData.openid = openid
      saveData.leafTotal = 0
      saveData.weeklyActiveDays = 0
      saveData.weeklyActiveDates = []
      saveData.streakDays = 0
      saveData.createdAt = db.serverDate()
      await db.collection('users').add({ data: saveData })
    }

    return {
      success: true,
      data: { isNew }
    }
  } catch (err) {
    console.error('保存用户资料失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '保存用户资料失败',
      data: null
    }
  }
}
