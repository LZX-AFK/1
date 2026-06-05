const cloud = require('wx-server-sdk')
const https = require('https')
const { scoreRecipes, buildNutritionGap } = require('./scorer')
const { EXCLUDED_CATEGORIES, DEFAULT_DIALOGUES, DEEPSEEK_PROMPT_TEMPLATE } = require('./constants')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// ============ HTTPS 工具 ============

function httpsPostJSON(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const options = {
      hostname, path, method: 'POST', timeout: 15000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }
    const req = https.request(options, (res) => {
      let chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        try { resolve(JSON.parse(raw)) } catch { resolve({ _raw: raw }) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

// ============ DeepSeek 文案生成（可选外挂） ============

async function generateReasons(topRecipes, nutritionGap, userGoal) {
  const apiKey = process.env.DOUBAO_API_KEY
  if (!apiKey) return null

  const candidateList = topRecipes.map((r, i) =>
    `${i + 1}. ${r.name}（${r.calories}kcal，蛋白${r.nutrition?.protein || '?'}%，脂肪${r.nutrition?.fat || '?'}%）`
  ).join('\n')

  const goalMap = { lose_fat: '减脂', gain_muscle: '增肌', maintain: '维持体重' }
  const prompt = DEEPSEEK_PROMPT_TEMPLATE
    .replace('{GOAL}', goalMap[userGoal] || '健康饮食')
    .replace('{CANDIDATES}', candidateList)
    .replace('{NUTRITION_GAP}', JSON.stringify(nutritionGap))

  try {
    const res = await httpsPostJSON('ark.cn-beijing.volces.com', '/api/v3/chat/completions', {
      model: 'deepseek-v4-flash-260425',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    }, { 'Authorization': `Bearer ${apiKey}` })

    const text = res.choices?.[0]?.message?.content
    if (!text) return null

    // 尝试解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.reasons && Array.isArray(parsed.reasons)) {
        return parsed.reasons
      }
    }
    return null
  } catch (err) {
    console.warn('DeepSeek 文案生成失败:', err.message)
    return null
  }
}

// ============ 主函数 ============

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errorCode: 'NOT_LOGGED_IN', errorMessage: '用户未登录', data: null }
  }

  const { todaysMeals, userGoal, calorieTarget, remainingCalories, remainingBudget } = event

  try {
    // Step 1: 从数据库拉食谱库（如果没有传入）
    let recipePool = event.recipePool
    if (!recipePool || recipePool.length === 0) {
      const recipeRes = await db.collection('recipes').limit(50).get()
      recipePool = recipeRes.data || []
    }

    if (recipePool.length === 0) {
      return {
        success: true,
        data: {
          recommendations: [],
          summary: '食谱库还在准备中，晚点再来看看吧～',
          nutritionGap: null
        }
      }
    }

    // Step 2: 计算营养缺口
    const nutritionGap = buildNutritionGap(todaysMeals || [], calorieTarget || 1500)

    // Step 3: 算法评分排序（纯函数，确定性）
    const scored = scoreRecipes(recipePool, {
      remainingCalories: remainingCalories || 500,
      remainingBudget: remainingBudget || 50,
      userGoal: userGoal || 'lose_fat',
      todaysMeals: todaysMeals || [],
      nutritionGap
    })

    // 取 Top 2
    const top2 = scored.slice(0, 2)

    if (top2.length === 0) {
      return {
        success: true,
        data: {
          recommendations: [],
          summary: '今天吃得差不多了，明天再推荐吧～',
          nutritionGap
        }
      }
    }

    // Step 4: DeepSeek 文案润色（可选，失败不影响结果）
    const aiReasons = await generateReasons(top2, nutritionGap, userGoal)

    // Step 5: 组装最终结果
    const recommendations = top2.map((recipe, idx) => {
      const aiReason = aiReasons?.[idx]?.reason
      const defaultReason = recipe.matchReason || `${recipe.name}营养均衡，适合今晚～`

      return {
        recipeId: recipe._id,
        title: recipe.name,
        type: recipe.type,
        calories: recipe.calories,
        price: recipe.priceRange || null,
        healthScore: recipe.healthScore,
        reason: aiReason || defaultReason,
        tone: recipe.tone || 'warm'
      }
    })

    // 生成总结语
    const goalSummary = {
      lose_fat: '今晚重点：控制热量，补充蛋白质～',
      gain_muscle: '今晚重点：高蛋白增肌餐～',
      maintain: '今晚重点：均衡营养～'
    }

    return {
      success: true,
      data: {
        recommendations,
        summary: goalSummary[userGoal] || goalSummary.maintain,
        nutritionGap
      }
    }
  } catch (err) {
    console.error('recommend 失败:', err)
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: err.message || '推荐服务异常',
      data: null
    }
  }
}
