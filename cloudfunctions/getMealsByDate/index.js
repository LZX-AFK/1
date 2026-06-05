const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 按日期查询饮食记录
 * @param {string} date - YYYY-MM-DD
 * @returns {Meal[]} 直接返回数组 + summary
 */
exports.main = async (event, context) => {
  const { date } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!date) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: '缺少日期参数',
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
    const result = await db
      .collection('meals')
      .where({ openid, record_date: date })
      .orderBy('created_at', 'asc')
      .get()

    const meals = (result.data || []).map(m => ({
      mealId: m._id,
      foodName: m.food_name || m.foodName || '',
      calories: m.calories || 0,
      price: m.price || 0,
      category: m.category || '',
      mealType: m.mealType || '',
      fatRatio: m.fat_ratio || m.fatRatio || 0,
      proteinRatio: m.protein_ratio || m.proteinRatio || 0,
      carbRatio: m.carb_ratio || m.carbRatio || 0,
      imageUrl: m.image_url || m.imageUrl || '',
      skinUrl: m.skin_url || m.skinUrl || '',
      dialogue: m.dialogue || '',
      portion: m.portion || '',
      createdAt: m.created_at || m.createdAt
    }))

    let totalCalories = 0
    let totalPrice = 0
    meals.forEach(m => {
      totalCalories += m.calories
      totalPrice += m.price
    })

    return {
      success: true,
      data: {
        meals,
        summary: {
          date,
          mealCount: meals.length,
          totalCalories: Math.round(totalCalories),
          totalPrice: parseFloat(totalPrice.toFixed(2))
        }
      }
    }
  } catch (err) {
    console.error('获取饮食记录失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取饮食记录失败',
      data: null
    }
  }
}
