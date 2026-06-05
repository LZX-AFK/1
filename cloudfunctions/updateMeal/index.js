const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 更新饮食记录
 * @param {string} mealId - 记录 ID
 * @param {object} updates - 部分更新字段
 */
exports.main = async (event, context) => {
  const { mealId, ...updates } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!mealId) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: '缺少 mealId',
      data: { updated: false }
    }
  }

  if (!openid) {
    return {
      success: false,
      errorCode: 'AUTH_FAILED',
      errorMessage: '用户未登录',
      data: { updated: false }
    }
  }

  // 只允许更新的白名单字段
  const allowedFields = ['foodName', 'food_name', 'calories', 'price', 'category', 'mealType', 'portion', 'dialogue']
  const safeUpdates = {}
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      safeUpdates[key] = updates[key]
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: '没有可更新的字段',
      data: { updated: false }
    }
  }

  try {
    const queryRes = await db.collection('meals').where({ mealId }).get()
    if (queryRes.data.length === 0) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        errorMessage: '记录不存在',
        data: { updated: false }
      }
    }
    const meal = queryRes.data[0]
    if (meal.openid !== openid) {
      return {
        success: false,
        errorCode: 'FORBIDDEN',
        errorMessage: '无权修改此记录',
        data: { updated: false }
      }
    }

    safeUpdates.updatedAt = db.serverDate()
    await db.collection('meals').doc(meal._id).update({ data: safeUpdates })

    return {
      success: true,
      data: { updated: true }
    }
  } catch (err) {
    console.error('更新饮食记录失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '更新失败',
      data: { updated: false }
    }
  }
}
