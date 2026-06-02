// cloudfunctions/generateSkinAndDialogue/index.js
// 云函数：生成食物角色皮肤图片 + 拟人对话文案
// 输入: { food_name, calories, fat_ratio, protein_ratio, carb_ratio }
// 输出: { skin_url, dialogue }
// 降级: 生图失败→默认占位图，生文失败→默认文案

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ========== 配置（从环境变量读取） ==========
const DOUBAO_API_KEY     = process.env.DOUBAO_API_KEY     || ''
const DOUBAO_IMG_MODEL   = process.env.DOUBAO_IMG_MODEL   || 'doubao-seedream-3-0-t2i-250415'  // 豆包文生图模型
const DOUBAO_TEXT_MODEL  = process.env.DOUBAO_TEXT_MODEL  || 'doubao-pro-32k-250115'             // 豆包文本模型

// 火山方舟 API 地址
const ARK_IMG_ENDPOINT  = 'ark.cn-beijing.volces.com'
const ARK_TEXT_ENDPOINT = 'ark.cn-beijing.volces.com'

// ========== 默认兜底内容 ==========
const DEFAULT_SKIN_URLS = {
  default: 'cloud://placeholder-default.png', // 需替换为云存储中实际占位图
  staple:   'cloud://placeholder-staple.png',
  meat:     'cloud://placeholder-meat.png',
  vegetable:'cloud://placeholder-vegetable.png',
  fruit:    'cloud://placeholder-fruit.png',
  dessert:  'cloud://placeholder-dessert.png',
  milk_tea: 'cloud://placeholder-milktea.png',
}

const DEFAULT_DIALOGUES = [
  '这一餐被团团认真记录好啦~',
  '记录下来就已经很棒啦！',
  '团团帮你收好了这一餐的记录~',
  '每次记录都是认真对待自己的证明呢。',
]

// ========== 工具函数 ==========

/**
 * HTTP POST 请求（火山方舟）
 */
function httpPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const defaultHeaders = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${DOUBAO_API_KEY}`,
      'Content-Length': Buffer.byteLength(data),
    }
    const req = https.request({
      hostname,
      path,
      method:  'POST',
      timeout: 45000,  // 生图可能较慢，给 45 秒
      headers: { ...defaultHeaders, ...headers },
    }, res => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch (e) { resolve(raw) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Doubao API timeout')) })
    req.write(data)
    req.end()
  })
}

/**
 * 将 base64 图片上传到云存储
 */
async function uploadImageToCloud(base64Data, fileName) {
  const cloudPath = `food-skins/${fileName}_${Date.now()}.png`
  const buffer = Buffer.from(base64Data, 'base64')
  const uploadResult = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
  })
  return uploadResult.fileID
}

/**
 * 获取默认占位图（按食物类别）
 */
function getDefaultSkin(category) {
  return DEFAULT_SKIN_URLS[category] || DEFAULT_SKIN_URLS['default']
}

/**
 * 获取随机默认对话
 */
function getDefaultDialogue() {
  return DEFAULT_DIALOGUES[Math.floor(Math.random() * DEFAULT_DIALOGUES.length)]
}

// ========== 豆包图像生成 ==========
async function generateImage(foodName) {
  const prompt = [
    `Cute chibi ${foodName} character,`,
    'kawaii Japanese anime style,',
    'soft green and warm color palette (light green, cream, warm orange),',
    'white background, rounded sticker card design,',
    'big round eyes, cute simple design,',
    'no text, no watermark, no background elements',
    'head-and-shoulders portrait only',
  ].join(' ')

  const body = {
    model: DOUBAO_IMG_MODEL,
    prompt,
    n: 1,
    size: '512x512',
    response_format: 'b64_json',
  }

  console.log(`[generateSkin] Prompt for "${foodName}": ${prompt}`)

  const result = await httpPost(ARK_IMG_ENDPOINT, '/v1/images/generations', body)

  // 火山方舟响应格式：{ data: [{ b64_json: "..." }] }
  if (result && result.data && result.data[0] && result.data[0].b64_json) {
    return result.data[0].b64_json
  }
  // 兼容 URL 返回格式：{ data: [{ url: "..." }] }
  if (result && result.data && result.data[0] && result.data[0].url) {
    return result.data[0].url // 直接返回 URL
  }

  console.error('[generateSkin] Unexpected response:', JSON.stringify(result).slice(0, 500))
  return null
}

// ========== 豆包文本生成（拟人对话） ==========
async function generateDialogue(foodName, calories, fatRatio, proteinRatio, carbRatio) {
  const systemPrompt = `你是食物"${foodName}"的拟人化角色，性格活泼可爱、温柔治愈。
你会用第一人称说一句俏皮可爱的角色台词，内容贴合该食物的营养特点。

规则：
- 40字以内
- 第一人称
- 语气俏皮、温暖
- 带一个小建议或小鼓励（非说教）
- 不要说教的语气，不要用"你应该"开头
- 贴合食物的真实营养特点`

  const userPrompt = `食物：${foodName}
热量：${calories}kcal
脂肪占比：${fatRatio}%
蛋白质占比：${proteinRatio}%
碳水占比：${carbRatio}%

请用第一人称，以"${foodName}"的角色身份说一句话（40字以内）：`

  const body = {
    model: DOUBAO_TEXT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens:   100,
    temperature:  0.9,
    top_p:        0.95,
  }

  const result = await httpPost(ARK_TEXT_ENDPOINT, '/v1/chat/completions', body)

  // 火山方舟返回格式：{ choices: [{ message: { content: "..." } }] }
  if (result && result.choices && result.choices[0] && result.choices[0].message) {
    const text = result.choices[0].message.content.trim()
    // 截断到 60 字（不让 AI 失控）
    return text.length > 60 ? text.slice(0, 60) + '…' : text
  }

  console.error('[generateDialogue] Unexpected response:', JSON.stringify(result).slice(0, 500))
  return null
}

// ========== 主入口 ==========
exports.main = async (event, context) => {
  const { food_name, calories = 0, fat_ratio = 0, protein_ratio = 0, carb_ratio = 0 } = event

  // 参数校验
  if (!food_name || !food_name.trim()) {
    return { code: -1, msg: '缺少 food_name 参数', data: null }
  }

  if (!DOUBAO_API_KEY) {
    console.error('[generateSkinAndDialogue] DOUBAO_API_KEY not configured')
    // 无 API Key 时直接返回默认内容
    return {
      code: 0,
      msg:  '使用默认内容（豆包 API 未配置）',
      data: {
        skin_url: getDefaultSkin('default'),
        dialogue: getDefaultDialogue(),
        is_default: true,
      },
    }
  }

  // 并行请求：生图 + 生文同时进行
  const [skinResult, dialogueResult] = await Promise.allSettled([
    generateImage(food_name),
    generateDialogue(food_name, calories, fat_ratio, protein_ratio, carb_ratio),
  ])

  // 处理生图结果
  let skinUrl
  let skinIsDefault = false
  if (skinResult.status === 'fulfilled' && skinResult.value) {
    const imageData = skinResult.value
    if (imageData.startsWith('http') || imageData.startsWith('cloud://')) {
      // 豆包返回了 URL 或已经是云存储地址
      skinUrl = imageData
    } else {
      // base64 数据 → 上传到云存储
      try {
        const safeName = food_name.replace(/[^a-zA-Z0-9一-龥]/g, '_')
        skinUrl = await uploadImageToCloud(imageData, safeName)
      } catch (uploadErr) {
        console.error('[generateSkin] Upload failed:', uploadErr.message)
        skinUrl = getDefaultSkin('default')
        skinIsDefault = true
      }
    }
  } else {
    // B06 降级：生图失败 → 默认占位图
    console.warn('[generateSkin] Generation failed, using default')
    skinUrl = getDefaultSkin('default')
    skinIsDefault = true
  }

  // 处理生文结果
  let dialogue
  let dialogueIsDefault = false
  if (dialogueResult.status === 'fulfilled' && dialogueResult.value) {
    dialogue = dialogueResult.value
  } else {
    // B06 降级：生文失败 → 默认文案
    console.warn('[generateDialogue] Generation failed, using default')
    dialogue = getDefaultDialogue()
    dialogueIsDefault = true
  }

  return {
    code: 0,
    msg:  '生成完成',
    data: {
      skin_url:          skinUrl,
      dialogue:          dialogue,
      is_default_skin:   skinIsDefault,
      is_default_dialogue: dialogueIsDefault,
    },
  }
}
