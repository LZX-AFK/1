const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errorCode: 'NOT_LOGGED_IN', errorMessage: '用户未登录', data: null }
  }

  try {
    // 并行查 skins 表（已解锁）和 skin_categories 表（全量定义）
    const [skinsRes, categoriesRes] = await Promise.all([
      db.collection('skins').where({ openid }).get(),
      db.collection('skin_categories').limit(30).get()
    ])

    const unlockedSkins = skinsRes.data || []
    const allCategories = categoriesRes.data || []

    // 已解锁的 category key 集合
    const unlockedKeys = new Set(unlockedSkins.map(s => s.foodCategory))

    // 组装返回列表
    const skins = allCategories.map(cat => {
      const isUnlocked = unlockedKeys.has(cat.categoryKey)
      const unlockedRecord = unlockedSkins.find(s => s.foodCategory === cat.categoryKey)

      return {
        skinId: cat._id,
        skinName: cat.displayName || `${cat.categoryKey}小人`,
        category: cat.categoryKey,
        isUnlocked,
        skinUrl: isUnlocked ? (unlockedRecord?.skinUrl || cat.defaultSkinUrl) : null,
        unlockDate: isUnlocked ? (unlockedRecord?.unlockedAt || null) : null,
        tone: cat.tone || 'warm'
      }
    })

    return {
      success: true,
      data: {
        skins,
        unlockedCount: unlockedSkins.length,
        totalCount: allCategories.length
      }
    }
  } catch (err) {
    console.error('getSkins 失败:', err)
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: err.message || '获取衣柜失败',
      data: null
    }
  }
}
