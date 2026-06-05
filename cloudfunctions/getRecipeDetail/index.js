const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 获取食谱详情
 * @param {string} recipeId - 食谱 ID
 */
exports.main = async (event, context) => {
  const { recipeId } = event

  if (!recipeId) {
    return {
      success: false,
      errorCode: 'INVALID_PARAMS',
      errorMessage: '缺少 recipeId',
      data: null
    }
  }

  try {
    const result = await db
      .collection('recipes')
      .doc(recipeId)
      .get()

    const raw = result.data

    // 构建 camelCase 输出 + 补充字段
    const recipe = {
      recipeId: raw._id,
      name: raw.name || '',
      type: raw.type || 'home',
      category: raw.category || '',
      calories: raw.calories || 0,
      priceRange: raw.price_range || raw.priceRange || '',
      cookingTime: raw.cooking_time || raw.cookingTime || 0,
      difficulty: raw.difficulty || 1,
      ingredients: raw.ingredients || [],
      ingredientsText: (raw.ingredients || []).join(' / '),
      steps: raw.steps || [],
      platform: raw.platform || '',
      coverImage: raw.cover_image || raw.coverImage || '',
      nutrition: raw.nutrition || { fat: 0, protein: 0, carb: 0 },
      pairings: raw.pairings || [],
      searchKeywords: raw.searchKeywords || raw.name || ''
    }

    return {
      success: true,
      data: recipe
    }
  } catch (err) {
    // 食谱不存在时返回兜底
    if (err.errCode === -1 || err.message?.includes('not exist')) {
      return {
        success: true,
        data: {
          recipeId,
          name: '未知食谱',
          type: 'home',
          category: '',
          calories: 0,
          priceRange: '',
          cookingTime: 0,
          difficulty: 1,
          ingredients: [],
          ingredientsText: '',
          steps: [],
          platform: '',
          coverImage: '',
          nutrition: { fat: 0, protein: 0, carb: 0 },
          pairings: [],
          searchKeywords: ''
        }
      }
    }

    console.error('获取食谱详情失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取食谱详情失败',
      data: null
    }
  }
}
