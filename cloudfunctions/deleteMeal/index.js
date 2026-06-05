const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 删除饮食记录
 * @param {string} mealId - 记录 ID
 * @returns {{ deleted: boolean }}
 */
exports.main = async (event, context) => {
  const { mealId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!mealId) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: '缺少 mealId',
      data: { deleted: false }
    }
  }

  if (!openid) {
    return {
      success: false,
      errorCode: 'AUTH_FAILED',
      errorMessage: '用户未登录',
      data: { deleted: false }
    }
  }

  try {
    const queryRes = await db.collection('meals').where({ mealId }).get()

    if (queryRes.data.length === 0) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        errorMessage: '记录不存在',
        data: { deleted: false }
      }
    }

    const meal = queryRes.data[0]
    if (meal.openid !== openid) {
      return {
        success: false,
        errorCode: 'FORBIDDEN',
        errorMessage: '无权删除此记录',
        data: { deleted: false }
      }
    }

    await db.collection('meals').doc(meal._id).remove()

    return {
      success: true,
      data: { deleted: true }
    }
  } catch (err) {
    console.error('删除饮食记录失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '删除失败',
      data: { deleted: false }
    }
  }
}
