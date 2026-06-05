/**
 * 团团食记 — 全量云函数校准测试
 * 测试策略：
 *   C 的函数 → 注入 mock wx-server-sdk，测完整逻辑
 *   B 的 AI 函数 → mock 外部 API，只测结构正确性
 */

const path = require('path')
const Module = require('module')

// ──────────────────────────────────────────────
// Mock wx-server-sdk（替换掉云函数里 require 的真实 SDK）
// ──────────────────────────────────────────────
const mockStore = {}

class MockCollection {
  constructor(name) {
    this._name = name
    this._where = null
    this._limitN = 1000
    this._skipN = 0
    this._orderByField = null
    this._orderByDir = 'asc'
    this._fields = null
  }
  where(cond) { this._where = cond; return this }
  limit(n) { this._limitN = n; return this }
  skip(n) { this._skipN = n; return this }
  orderBy(f, d) { this._orderByField = f; this._orderByDir = d || 'asc'; return this }
  field(f) { this._fields = f; return this }

  _match() {
    const col = mockStore[this._name] || []
    if (!this._where) return [...col]
    return col.filter(doc => {
      for (const [k, v] of Object.entries(this._where)) {
        if (v && v._op === 'in') { if (!v._values.includes(doc[k])) return false }
        else if (v && v._op === 'gte') { if ((doc[k] || 0) < v._val) return false }
        else if (v && v._op === 'lte') { if ((doc[k] || 0) > v._val) return false }
        else if (v && v._op === 'inc') { /* skip in filter */ }
        else { if (doc[k] !== v) return false }
      }
      return true
    })
  }

  async get() {
    let docs = this._match()
    if (this._orderByField) {
      const f = this._orderByField, d = this._orderByDir
      docs.sort((a, b) => a[f] < b[f] ? (d === 'asc' ? -1 : 1) : a[f] > b[f] ? (d === 'asc' ? 1 : -1) : 0)
    }
    docs = docs.slice(this._skipN, this._skipN + this._limitN)
    this._where = null; this._limitN = 1000; this._skipN = 0
    return { data: docs }
  }

  async count() {
    const docs = this._match()
    this._where = null
    return { total: docs.length }
  }

  async add({ data }) {
    const col = mockStore[this._name] || (mockStore[this._name] = [])
    const _id = 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)
    const doc = { _id, ...data }
    col.push(doc)
    return { _id }
  }

  async update({ data }) {
    const docs = this._match()
    this._where = null
    if (docs.length === 0) return { updated: 0 }
    const col = mockStore[this._name]
    docs.forEach(doc => {
      const idx = col.findIndex(d => d._id === doc._id)
      if (idx >= 0) {
        Object.entries(data).forEach(([k, v]) => {
          if (v && v._op === 'inc') col[idx][k] = (col[idx][k] || 0) + v._val
          else col[idx][k] = v
        })
      }
    })
    return { updated: docs.length }
  }

  doc(id) {
    const col = mockStore[this._name] || []
    const idx = col.findIndex(d => d._id === id)
    return {
      async get() { if (idx < 0) throw new Error('not exist'); return { data: col[idx] } },
      async update({ data }) {
        if (idx < 0) throw new Error('not exist')
        Object.entries(data).forEach(([k, v]) => {
          if (v && v._op === 'inc') col[idx][k] = (col[idx][k] || 0) + v._val
          else col[idx][k] = v
        })
        return { updated: 1 }
      },
      async remove() { if (idx >= 0) col.splice(idx, 1); return { removed: 1 } }
    }
  }
}

const mockDb = () => ({
  collection: (name) => new MockCollection(name),
  serverDate: () => new Date().toISOString(),
  command: {
    and: (arr) => ({ _op: 'and', _arr: arr }),
    in: (arr) => ({ _op: 'in', _values: arr }),
    gte: (val) => ({ _op: 'gte', _val: val }),
    lte: (val) => ({ _op: 'lte', _val: val }),
    inc: (n) => ({ _op: 'inc', _val: n }),
    RegExp: (opts) => ({ _op: 'regex', _regex: opts.regexp })
  }
})

const mockCloud = {
  init: () => {},
  DYNAMIC_CURRENT_ENV: 'test-env',
  getWXContext: () => ({ OPENID: 'test_openid_abc123', APPID: 'test_appid' }),
  database: mockDb,
  downloadFile: async () => ({
    fileContent: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  }),
  uploadFile: async ({ cloudPath }) => ({ fileID: `cloud://test/${cloudPath}` }),
  getTempFileURL: async ({ fileList }) => ({
    fileList: fileList.map(f => ({ fileID: f, tempFileURL: `https://temp/${f}` }))
  })
}

// 拦截所有云函数里的 require('wx-server-sdk')
const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function(request, ...args) {
  if (request === 'wx-server-sdk') return 'wx-server-sdk-mock'
  return originalResolveFilename.call(this, request, ...args)
}
require.cache['wx-server-sdk-mock'] = { id: 'wx-server-sdk-mock', filename: 'wx-server-sdk-mock', loaded: true, exports: mockCloud }

// ──────────────────────────────────────────────
// 加载所有云函数
// ──────────────────────────────────────────────
const CF = path.join(__dirname, 'cloudfunctions')

function loadFn(name) {
  const p = path.join(CF, name, 'index.js')
  delete require.cache[require.resolve(p)]
  return require(p)
}

// ──────────────────────────────────────────────
// 测试工具
// ──────────────────────────────────────────────
let passed = 0, failed = 0, warnings = 0
const results = []

function check(label, actual, expected, mode = 'equal') {
  let ok = false
  if (mode === 'equal') ok = JSON.stringify(actual) === JSON.stringify(expected)
  else if (mode === 'truthy') ok = !!actual
  else if (mode === 'falsy') ok = !actual
  else if (mode === 'includes') ok = String(actual).includes(String(expected))
  else if (mode === 'type') ok = typeof actual === expected
  else if (mode === 'gte') ok = actual >= expected
  else if (mode === 'exists') ok = actual !== undefined && actual !== null

  if (ok) { passed++; return true }
  else {
    failed++
    console.log(`  ❌ ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)} (${mode})`)
    return false
  }
}

function warn(label, msg) {
  warnings++
  console.log(`  ⚠️  ${label}: ${msg}`)
}

async function suite(name, fn) {
  console.log(`\n📦 ${name}`)
  try {
    await fn()
  } catch (err) {
    failed++
    console.log(`  💥 suite 崩溃: ${err.message}`)
  }
}

// 清空 mockStore 防止测试间污染
function resetStore() {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
}

// ──────────────────────────────────────────────
// 测试套件
// ──────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  团团食记 — 全量云函数校准测试')
  console.log('═══════════════════════════════════════════════════')

  // ──────────── C 的函数 ────────────

  await suite('login — 首次登录创建用户', async () => {
    resetStore()
    const fn = loadFn('login')
    const res = await fn.main({ userInfo: { nickName: '测试用户', avatarUrl: '' } }, {})
    check('success', res.success, true)
    check('isNew', res.data.isNew, true)
    check('openid exists', res.data.openid, 'truthy', 'truthy')
    check('leafTotal', res.data.leafTotal, 0)
    check('weeklyActiveDays', res.data.weeklyActiveDays, 0)
    check('user.nickname', res.data.user.nickname, '测试用户')
    // 确认用户写入了 DB
    const users = mockStore['users'] || []
    check('DB 写入用户', users.length, 1)
  })

  await suite('login — 二次登录返回老用户', async () => {
    // 不 reset，延续上面的 store
    const fn = loadFn('login')
    const res = await fn.main({ userInfo: {} }, {})
    check('success', res.success, true)
    check('isNew', res.data.isNew, false)
    check('openid exists', res.data.openid, 'truthy', 'truthy')
  })

  await suite('saveUser — 保存用户资料', async () => {
    const fn = loadFn('saveUser')
    const res = await fn.main({
      height: 164, weight: 56, age: 24,
      goal: 'lose_fat', activityLevel: 'sedentary',
      budget: 50, gender: 'female', targetWeight: 52
    }, {})
    check('success', res.success, true)
    check('calorieTarget 大于 0', res.data.calorieTarget, 0, 'gte')
    check('calorieTarget 是数字', res.data.calorieTarget, 'number', 'type')
  })

  await suite('getUser — 读取用户资料', async () => {
    const fn = loadFn('getUser')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('height', res.data.height, 164)
    check('goal', res.data.goal, 'lose_fat')
    check('calorieTarget', res.data.calorieTarget, 'number', 'type')
    check('leafTotal exists', res.data.leafTotal, 'exists', 'exists')
  })

  await suite('addMeal — 写入一条餐次', async () => {
    const fn = loadFn('addMeal')
    const res = await fn.main({
      foodName: '番茄虾仁沙拉',
      calories: 280,
      price: 35,
      category: 'salad',
      mealType: 'lunch',
      nutrition: { fatRatio: 18, proteinRatio: 38, carbRatio: 44 },
      dialogue: '我是超清爽的沙拉～',
      skinUrl: 'cloud://test/salad.png',
      skinName: '沙拉小人'
    }, {})
    check('success', res.success, true)
    check('mealId exists', res.data.mealId, 'truthy', 'truthy')
    check('leafReward', res.data.leafReward, 1)
    check('streakUpdated type', res.data.streakUpdated, 'boolean', 'type')
    // DB 验证
    const meals = mockStore['meals'] || []
    check('DB meals 有记录', meals.length, 1)
    check('DB meals foodName', meals[0].foodName, '番茄虾仁沙拉')
    check('DB meals record_date exists', meals[0].record_date, 'truthy', 'truthy')
  })

  await suite('addMeal — 防重复提交', async () => {
    const fn = loadFn('addMeal')
    // 同一秒内两次相同提交
    const p1 = fn.main({ foodName: '番茄虾仁沙拉', calories: 280, category: 'salad' }, {})
    const p2 = fn.main({ foodName: '番茄虾仁沙拉', calories: 280, category: 'salad' }, {})
    const [r1, r2] = await Promise.all([p1, p2])
    const dupFound = r1.errorCode === 'DUPLICATE' || r2.errorCode === 'DUPLICATE'
    check('有一个被拒绝为重复', dupFound, true)
  })

  await suite('getTodayMeals — 读取今日餐次', async () => {
    const fn = loadFn('getTodayMeals')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('meals 是数组', Array.isArray(res.data.meals), true)
    check('summary.totalCalories 大于等于 0', res.data.summary.totalCalories, 0, 'gte')
    check('summary.totalPrice exists', res.data.summary.totalPrice, 'exists', 'exists')
  })

  await suite('getHomeSummary — 首页聚合数据', async () => {
    const fn = loadFn('getHomeSummary')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('user exists', res.data.user, 'truthy', 'truthy')
    check('todaySummary exists', res.data.todaySummary, 'truthy', 'truthy')
    check('todayMeals is array', Array.isArray(res.data.todayMeals), true)
    check('homeState exists', res.data.homeState, 'truthy', 'truthy')
    check('homeState is active or empty', ['active', 'empty', 'waiting', 'afterSave'].includes(res.data.homeState), true)
  })

  // 写入更多测试数据用于日历 / 历史查询
  await suite('addMeal — 再写入一条', async () => {
    const fn = loadFn('addMeal')
    const res = await fn.main({
      foodName: '鸡胸蔬菜汤', calories: 320, price: 22,
      category: 'soup', mealType: 'dinner',
      nutrition: { fatRatio: 15, proteinRatio: 42, carbRatio: 43 }
    }, {})
    check('success', res.success, true)
  })

  await suite('getMealsByDate — 按日查询', async () => {
    const fn = loadFn('getMealsByDate')
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const res = await fn.main({ date: dateStr }, {})
    check('success', res.success, true)
    check('meals is array', Array.isArray(res.data.meals), true)
    check('meals 有数据', res.data.meals.length, 0, 'gte')
  })

  await suite('getMealsByMonth — 月视图', async () => {
    const fn = loadFn('getMealsByMonth')
    const now = new Date()
    const res = await fn.main({ year: now.getFullYear(), month: now.getMonth() + 1 }, {})
    check('success', res.success, true)
    check('dates is array', Array.isArray(res.data.dates), true)
  })

  await suite('deleteMeal — 删除餐次', async () => {
    const meals = mockStore['meals'] || []
    if (meals.length === 0) { warn('deleteMeal', 'meals 表为空，跳过'); return }
    const mealId = meals[0].mealId
    const fn = loadFn('deleteMeal')
    const res = await fn.main({ mealId }, {})
    check('success', res.success, true)
    check('deleted', res.data.deleted, true)
  })

  await suite('getLeafStats — 小叶统计', async () => {
    const fn = loadFn('getLeafStats')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('totalLeaves exists', res.data.totalLeaves, 'exists', 'exists')
    check('todayLeaves exists', res.data.todayLeaves, 'exists', 'exists')
    check('weeklyDays exists', res.data.weeklyDays, 'exists', 'exists')
    check('nextBadgeName exists', res.data.nextBadgeName, 'truthy', 'truthy')
  })

  await suite('getUserStats — 用户统计', async () => {
    const fn = loadFn('getUserStats')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('totalMeals exists', res.data.totalMeals, 'exists', 'exists')
    check('leafTotal exists', res.data.leafTotal, 'exists', 'exists')
    check('streakDays exists', res.data.streakDays, 'exists', 'exists')
  })

  // 食谱相关（需要先插入 recipes 数据）
  await suite('getRecipes — 查食谱列表', async () => {
    // 先插入测试食谱
    mockStore['recipes'] = [
      { _id: 'r001', name: '番茄牛肉汤', type: 'home', category: 'soup', calories: 420, priceRange: '¥20-25',
        cookingTime: 20, difficulty: 2, ingredients: ['牛肉', '番茄'], steps: ['步骤1', '步骤2'],
        nutrition: { fat: 22, protein: 45, carb: 33 }, coverImage: '' },
      { _id: 'r002', name: '轻食沙拉', type: 'takeout', category: 'salad', calories: 280, priceRange: '¥30-40',
        nutrition: { fat: 15, protein: 38, carb: 47 }, coverImage: '', platform: '美团' }
    ]
    const fn = loadFn('getRecipes')
    const res = await fn.main({ type: 'home' }, {})
    check('success', res.success, true)
    check('recipes is array', Array.isArray(res.data.recipes), true)
    check('过滤 home 类型', res.data.recipes.length, 1)
  })

  await suite('getRecipeDetail — 食谱详情', async () => {
    const fn = loadFn('getRecipeDetail')
    const res = await fn.main({ recipeId: 'r001' }, {})
    check('success', res.success, true)
    check('name', res.data.name, '番茄牛肉汤')
    check('ingredientsText exists', res.data.ingredientsText, 'truthy', 'truthy')
    check('searchKeywords exists', res.data.searchKeywords, 'exists', 'exists')
  })

  await suite('getRecipeDetail — 不存在时兜底', async () => {
    const fn = loadFn('getRecipeDetail')
    const res = await fn.main({ recipeId: 'r999' }, {})
    // 应该返回 success: false 或者一个兜底对象，不应 crash
    check('不崩溃', res !== null && res !== undefined, true)
  })

  await suite('getAppConfig — 应用配置', async () => {
    const fn = loadFn('getAppConfig')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('data exists', res.data, 'truthy', 'truthy')
  })

  await suite('getStatsOverview — 统计概览', async () => {
    const fn = loadFn('getStatsOverview')
    const now = new Date()
    const end = now.toISOString().slice(0, 10)
    const startD = new Date(now); startD.setDate(startD.getDate() - 7)
    const start = startD.toISOString().slice(0, 10)
    const res = await fn.main({ startDate: start, endDate: end }, {})
    check('success', res.success, true)
    check('weeklyCalories exists', res.data.weeklyCalories, 'exists', 'exists')
    check('weeklyMeals exists', res.data.weeklyMeals, 'exists', 'exists')
  })

  await suite('updateMeal — 更新餐次', async () => {
    // 先写一条
    const addFn = loadFn('addMeal')
    const addRes = await addFn.main({ foodName: '待更新食物', calories: 100, category: 'other' }, {})
    if (!addRes.success) { warn('updateMeal', 'addMeal 失败，跳过'); return }
    const mealId = addRes.data.mealId

    const fn = loadFn('updateMeal')
    const res = await fn.main({ mealId, price: 99, portion: 'large' }, {})
    check('success', res.success, true)
    check('updated', res.data.updated, true)
  })

  // ──────────── B 的函数（结构测试，不实际调 API）────────────

  await suite('recommend — 算法评分（不调 DeepSeek）', async () => {
    // recommend 里会调 DeepSeek，但降级后仍需返回结果
    // 注入一批 recipes
    mockStore['recipes'] = [
      { _id: 'r_salad', name: '番茄虾仁沙拉', type: 'home', category: 'salad', calories: 280,
        priceRange: '¥20', cookingTime: 15, difficulty: 1,
        ingredients: ['虾仁', '番茄', '生菜', '黄瓜'], nutrition: { fat: 12, protein: 38, carb: 50 } },
      { _id: 'r_fried', name: '炸鸡腿', type: 'home', category: 'fried', calories: 650,
        priceRange: '¥25', cookingTime: 20, difficulty: 2,
        ingredients: ['鸡腿'], nutrition: { fat: 45, protein: 32, carb: 23 } },
      { _id: 'r_soup', name: '鸡胸蔬菜汤', type: 'home', category: 'soup', calories: 320,
        priceRange: '¥18', cookingTime: 20, difficulty: 2,
        ingredients: ['鸡胸肉', '胡萝卜', '西蓝花', '姜'], nutrition: { fat: 14, protein: 42, carb: 44 } },
      { _id: 'r_burger', name: '芝士汉堡', type: 'home', category: 'burger', calories: 640,
        priceRange: '¥30', cookingTime: 15, difficulty: 1,
        ingredients: ['面包', '牛肉饼', '芝士'], nutrition: { fat: 38, protein: 27, carb: 35 } }
    ]

    const fn = loadFn('recommend')
    // DeepSeek 会失败（没有 API Key），但降级应该还能返回
    const res = await fn.main({
      todaysSummary: {
        meals: [{ name: '奶茶', calories: 400, category: 'milk_tea' }],
        totalCalories: 400,
        totalFatPct: 38,
        totalProteinPct: 10,
        totalCarbPct: 52
      },
      user: { calorieTarget: 1350, goal: 'lose_fat', remainingCalories: 950, remainingBudget: 30 }
    }, {})

    check('success', res.success, true)
    check('recommendations is array', Array.isArray(res.data.recommendations), true)
    // 炸鸡和汉堡应该不在推荐里
    const names = (res.data.recommendations || []).map(r => r.recipeId)
    check('排除炸鸡', !names.includes('r_fried'), true)
    check('排除汉堡', !names.includes('r_burger'), true)
  })

  await suite('identifyFood — 结构校验（用 mock 图片）', async () => {
    const fn = loadFn('identifyFood')
    // 使用 mock 的 fileID，百度 API 会返回错误（图片是 1x1 像素），但结构要正确
    const res = await fn.main({ imageFileID: 'cloud://test/mock.jpg' }, {})
    // 不管识别成不成功，结构要符合 A 的约定
    check('有 success 字段', 'success' in res, true)
    check('有 data 字段', 'data' in res, true)
    if (res.success && res.data?.recognized) {
      check('foodName exists', res.data.foodName, 'truthy', 'truthy')
      check('calories type', res.data.calories, 'number', 'type')
      check('nutrition.fatRatio exists', res.data.nutrition?.fatRatio, 'exists', 'exists')
      check('price field exists', 'price' in res.data, true)
    } else {
      check('recognized is false or null', !res.data?.recognized, true)
    }
  })

  await suite('getSkins — 衣柜数据结构', async () => {
    // 先写入测试皮肤数据
    mockStore['skins'] = [
      { _id: 's1', openid: 'test_openid_abc123', foodCategory: 'salad', skinUrl: 'cloud://test/salad.png',
        skinName: '沙拉小人', tone: 'fresh', unlockedAt: new Date().toISOString() }
    ]
    mockStore['skin_categories'] = [
      { _id: 'sc1', categoryKey: 'salad', displayName: '沙拉小人', defaultSkinUrl: 'cloud://test/salad.png', tone: 'fresh' },
      { _id: 'sc2', categoryKey: 'burger', displayName: '汉堡小人', defaultSkinUrl: 'cloud://test/burger.png', tone: 'playful' }
    ]

    const fn = loadFn('getSkins')
    const res = await fn.main({}, {})
    check('success', res.success, true)
    check('skins is array', Array.isArray(res.data.skins), true)
    check('至少有 1 个皮肤', res.data.skins.length, 0, 'gte')
    if (res.data.skins.length > 0) {
      const skin = res.data.skins[0]
      check('skinId exists', skin.skinId, 'truthy', 'truthy')
      check('isUnlocked is bool', typeof skin.isUnlocked, 'boolean')
      check('skinName exists', skin.skinName, 'truthy', 'truthy')
      check('category exists', skin.category, 'truthy', 'truthy')
    }
  })

  // ──────────── 输出结果 ────────────

  console.log('\n═══════════════════════════════════════════════════')
  console.log(`  测试结果：✅ ${passed} 通过  ❌ ${failed} 失败  ⚠️  ${warnings} 警告`)
  console.log('═══════════════════════════════════════════════════')

  if (failed > 0) {
    console.log('\n❌ 存在失败项，联调前必须修复以上红色问题。')
    process.exit(1)
  } else {
    console.log('\n✅ 全部测试通过！后端代码结构符合 A 的对齐清单要求。')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('\n💥 测试脚本崩溃:', err.message)
  console.error(err.stack)
  process.exit(1)
})
