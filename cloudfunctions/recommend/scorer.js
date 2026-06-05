/**
 * 推荐算法核心 — 纯函数，100% 确定性，不调用任何 AI
 *
 * 五步流程：
 *   Step 1: 健康过滤（排除垃圾食品类别）
 *   Step 2: 热量约束（排除超出剩余热量的）
 *   Step 3: 营养评分（满分 100）
 *   Step 4: 营养缺口匹配加权
 *   Step 5: 排序取 Top N
 */

const { HEALTH_TIER_1, HEALTH_TIER_2, EXCLUDED_CATEGORIES } = require('./constants')

// ============ Step 1: 健康过滤 ============

function filterByHealth(recipes) {
  return recipes.filter(r => {
    const cat = (r.category || '').toLowerCase()
    return !EXCLUDED_CATEGORIES.includes(cat)
  })
}

// ============ Step 2: 热量约束 ============

function filterByCalories(recipes, remainingCalories) {
  const limit = remainingCalories + 100 // 容差 100kcal
  return recipes.filter(r => !r.calories || r.calories <= limit)
}

// ============ Step 3: 营养评分（满分 100）============

function scoreByNutrition(recipe, userGoal, todaysCategories) {
  let score = 0
  const cat = (recipe.category || '').toLowerCase()
  const nutrition = recipe.nutrition || {}
  const fatPct = nutrition.fat || 50
  const proteinPct = nutrition.protein || 25
  const ingredients = recipe.ingredients || []

  // 3.1 健康类别加分
  if (HEALTH_TIER_1.includes(cat)) {
    score += 30
  } else if (HEALTH_TIER_2.includes(cat)) {
    score += 15
  }

  // 3.2 高蛋白（蛋白占比 ≥ 35%）
  if (proteinPct >= 35) score += 25

  // 3.3 低脂（脂肪占比 ≤ 20%）
  if (fatPct <= 20) score += 20

  // 3.4 多食材（≥ 4 种）
  if (ingredients.length >= 4) score += 10

  // 3.5 高纤维（蔬菜/菌菇类食材 ≥ 2 种）
  const vegKeywords = ['蔬菜', '青菜', '白菜', '菠菜', '西兰花', '胡萝卜', '番茄', '黄瓜', '蘑菇', '香菇', '木耳', '生菜', '芹菜']
  const vegCount = ingredients.filter(i =>
    vegKeywords.some(kw => (i.name || '').includes(kw))
  ).length
  if (vegCount >= 2) score += 15

  // 3.6 目标模式额外加分
  if (userGoal === 'lose_fat') {
    if (proteinPct >= 35 && fatPct <= 15 && (recipe.calories || 999) <= 350) {
      score += 20 // 减脂完美餐
    }
  } else if (userGoal === 'gain_muscle') {
    if (proteinPct >= 40 && (recipe.calories || 0) >= 300) {
      score += 20 // 增肌完美餐
    }
  }

  // 3.7 类别多样性（今日已吃过同类别扣分）
  if (todaysCategories.includes(cat)) {
    score -= 20
  }

  return Math.max(0, score)
}

// ============ Step 4: 营养缺口匹配加权 ============

function applyNutritionGapWeight(score, recipe, nutritionGap) {
  const nutrition = recipe.nutrition || {}
  const fatPct = nutrition.fat || 50
  const proteinPct = nutrition.protein || 25
  const carbPct = nutrition.carb || 50
  let multiplier = 1.0

  // 缺蛋白质 → 高蛋白食谱加权
  if (nutritionGap.proteinLow && proteinPct >= 35) {
    multiplier *= 1.3
  }

  // 脂肪超标 → 低脂食谱加权
  if (nutritionGap.fatHigh && fatPct <= 20) {
    multiplier *= 1.3
  }

  // 碳水超标 → 低碳食谱加权
  if (nutritionGap.carbsHigh && carbPct <= 40) {
    multiplier *= 1.3
  }

  // 纤维不足 → 蔬菜类食谱加权
  if (nutritionGap.fiberLow) {
    const cat = (recipe.category || '').toLowerCase()
    if (['蔬菜', '轻食', '沙拉'].some(k => cat.includes(k))) {
      multiplier *= 1.5
    }
  }

  return Math.round(score * multiplier)
}

// ============ Step 5: 排序取 Top N ============

function sortAndSlice(scored, n = 2) {
  return scored
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, n)
}

// ============ 营养缺口计算 ============

function buildNutritionGap(todaysMeals, calorieTarget) {
  if (!todaysMeals || todaysMeals.length === 0) {
    return {
      totalCalories: 0,
      remainingCalories: calorieTarget,
      proteinLow: true,
      fatHigh: false,
      carbsOk: false,
      fiberLow: true
    }
  }

  let totalCalories = 0
  let totalFat = 0
  let totalProtein = 0
  let totalCarb = 0
  let hasVegetable = false

  const vegKeywords = ['蔬菜', '青菜', '白菜', '菠菜', '西兰花', '沙拉', '轻食']

  todaysMeals.forEach(m => {
    totalCalories += m.calories || 0
    const fatRatio = (m.fatRatio || m.fat_ratio || 30) / 100
    const proteinRatio = (m.proteinRatio || m.protein_ratio || 30) / 100
    const carbRatio = (m.carbRatio || m.carb_ratio || 40) / 100

    totalFat += (m.calories || 0) * fatRatio
    totalProtein += (m.calories || 0) * proteinRatio
    totalCarb += (m.calories || 0) * carbRatio

    const cat = (m.category || '').toLowerCase()
    if (vegKeywords.some(k => cat.includes(k))) hasVegetable = true
  })

  const totalMacro = totalFat + totalProtein + totalCarb || 1
  const fatPct = totalFat / totalMacro * 100
  const proteinPct = totalProtein / totalMacro * 100
  const carbPct = totalCarb / totalMacro * 100

  return {
    totalCalories: Math.round(totalCalories),
    remainingCalories: Math.max(0, calorieTarget - totalCalories),
    proteinLow: proteinPct < 25,
    fatHigh: fatPct > 35,
    carbsHigh: carbPct > 50,
    carbsOk: carbPct <= 50,
    fiberLow: !hasVegetable,
    fatPct: Math.round(fatPct),
    proteinPct: Math.round(proteinPct),
    carbPct: Math.round(carbPct)
  }
}

// ============ 主评分函数 ============

function scoreRecipes(recipePool, options) {
  const { remainingCalories, remainingBudget, userGoal, todaysMeals, nutritionGap } = options

  // 提取今日已吃类别
  const todaysCategories = (todaysMeals || []).map(m => (m.category || '').toLowerCase())

  // Step 1: 健康过滤
  let candidates = filterByHealth(recipePool)

  // Step 2: 热量约束
  candidates = filterByCalories(candidates, remainingCalories)

  // 如果候选不足，放宽热量约束再筛一次
  if (candidates.length < 3) {
    candidates = filterByHealth(recipePool) // 只保留健康过滤
  }

  // Step 3 + 4: 评分 + 营养缺口加权
  const scored = candidates.map(recipe => {
    const baseScore = scoreByNutrition(recipe, userGoal, todaysCategories)
    const finalScore = applyNutritionGapWeight(baseScore, recipe, nutritionGap)

    // 生成匹配理由
    let matchReason = ''
    const nutrition = recipe.nutrition || {}
    if (nutrition.protein >= 35) matchReason += '高蛋白'
    if (nutrition.fat <= 20) matchReason += (matchReason ? '低脂' : '低脂')
    if (!matchReason) matchReason = '营养均衡'
    matchReason += `，${recipe.name}适合今晚～`

    return {
      ...recipe,
      healthScore: baseScore,
      finalScore,
      matchReason,
      tone: 'warm'
    }
  })

  // Step 5: 排序取 Top 2
  return sortAndSlice(scored, 2)
}

module.exports = { scoreRecipes, buildNutritionGap }
