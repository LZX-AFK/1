const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 获取今日饮食记录
 * @param {string} [date] - 可选日期 YYYY-MM-DD，默认今天
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

  // 支持可选 date 参数，默认今天
  let queryDate = event.date
  if (!queryDate) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    queryDate = `${y}-${m}-${d}`
  }

  try {
    const result = await db
      .collection('meals')
      .where({ openid, record_date: queryDate })
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
      imageFileID: m.image_file_id || m.imageFileID || '',
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
          totalCalories: Math.round(totalCalories),
          totalPrice: parseFloat(totalPrice.toFixed(2)),
          mealCount: meals.length,
          date: queryDate
        }
      }
    }
  } catch (err) {
    console.error('获取今日饮食记录失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取今日饮食记录失败',
      data: {
        meals: [],
        summary: { totalCalories: 0, totalPrice: 0, mealCount: 0, date: queryDate }
      }
    }
  }
}
