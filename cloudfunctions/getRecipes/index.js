const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 获取食谱列表
 * @param {string} type - home/takeout（可选）
 * @param {string} category - 类别（可选）
 * @param {string[]} ids - 食谱 ID 数组（可选，优先级最高）
 * @param {number} limit - 默认 20
 * @param {number} page - 默认 1
 */
exports.main = async (event, context) => {
  const { type, category, ids, limit = 20, page = 1 } = event

  try {
    let query = db.collection('recipes')

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await query.where({ _id: _.in(ids) }).get()
      return {
        success: true,
        data: {
          recipes: result.data.map(formatRecipe),
          total: result.data.length
        }
      }
    }

    const where = {}
    if (type) where.type = type
    if (category) where.category = category

    const skip = (page - 1) * limit

    const [result, countResult] = await Promise.all([
      query.where(where).orderBy('calories', 'asc').skip(skip).limit(limit).get(),
      query.where(where).count()
    ])

    return {
      success: true,
      data: {
        recipes: result.data.map(formatRecipe),
        total: countResult.total,
        page,
        limit,
        hasMore: skip + result.data.length < countResult.total
      }
    }
  } catch (err) {
    console.error('获取食谱失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取食谱失败',
      data: { recipes: [], total: 0 }
    }
  }
}

function formatRecipe(r) {
  return {
    recipeId: r._id,
    name: r.name || '',
    type: r.type || 'home',
    category: r.category || '',
    calories: r.calories || 0,
    priceRange: r.price_range || r.priceRange || '',
    cookingTime: r.cooking_time || r.cookingTime || 0,
    difficulty: r.difficulty || 1,
    ingredients: r.ingredients || [],
    steps: r.steps || [],
    platform: r.platform || '',
    coverImage: r.cover_image || r.coverImage || '',
    nutrition: r.nutrition || { fat: 0, protein: 0, carb: 0 }
  }
}
