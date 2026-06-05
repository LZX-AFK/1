/**
 * 推荐引擎常量配置
 */

// 永不推荐的垃圾食品类别
const EXCLUDED_CATEGORIES = [
  'burger', 'fried', 'dessert', 'milk_tea', 'pizza', 'snack'
]

// 健康优先第一梯队（+30 分）
const HEALTH_TIER_1 = [
  'soup', 'salad', 'vegetable', 'seafood', 'egg', 'tofu', 'fruit', 'congee'
]

// 健康优先第二梯队（+15 分）
const HEALTH_TIER_2 = [
  'staple', 'noodle', 'meat', 'sushi', 'hotpot'
]

// 降级默认推荐文案
const DEFAULT_DIALOGUES = [
  '今晚来点清淡的吧，身体会感谢你的～',
  '蛋白质是好东西！补充一点让明天更有活力～',
  '蔬菜永远是餐桌上的好朋友，多吃点准没错～'
]

// DeepSeek 文案 Prompt 模板
const DEEPSEEK_PROMPT_TEMPLATE = `你是一个可爱的饮食推荐助手。请根据用户情况和候选食谱，为每条推荐写一句俏皮的推荐语。

用户目标：{GOAL}

候选食谱：
{CANDIDATES}

用户今日营养缺口：{NUTRITION_GAP}

请返回纯 JSON（不要 markdown）：
{
  "reasons": [
    {"index": 1, "reason": "30字以内的推荐语"},
    {"index": 2, "reason": "30字以内的推荐语"}
  ]
}`

module.exports = {
  EXCLUDED_CATEGORIES,
  HEALTH_TIER_1,
  HEALTH_TIER_2,
  DEFAULT_DIALOGUES,
  DEEPSEEK_PROMPT_TEMPLATE
}
