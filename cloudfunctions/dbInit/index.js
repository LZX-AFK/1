// ============================================================
// dbInit — B 的数据库初始化云函数
// 一次性执行：创建 meals + skins + skin_categories 三个集合
// 部署后运行一次即可，后续不再调用
// ============================================================

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const results = { meals: null, skins: null, skin_categories: null }

  // ── 1. 创建 meals 集合 ──
  try {
    await db.createCollection('meals')
    results.meals = 'created'
  } catch (e) {
    results.meals = e.errCode === -502005 ? 'already_exists' : `error: ${e.message}`
  }

  // ── 2. 创建 skins 集合 ──
  try {
    await db.createCollection('skins')
    results.skins = 'created'
  } catch (e) {
    results.skins = e.errCode === -502005 ? 'already_exists' : `error: ${e.message}`
  }

  // ── 3. 创建 skin_categories 集合 ──
  try {
    await db.createCollection('skin_categories')
    results.skin_categories = 'created'
  } catch (e) {
    results.skin_categories = e.errCode === -502005 ? 'already_exists' : `error: ${e.message}`
  }

  return {
    success: true,
    message: 'B 的三张表初始化完成',
    results
  }
}
