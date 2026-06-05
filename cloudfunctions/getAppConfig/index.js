const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 获取应用配置
 */
exports.main = async (event, context) => {
  try {
    const result = await db.collection('app_config').limit(1).get()

    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      }
    }

    // 返回默认配置
    return {
      success: true,
      data: {
        leafPerMeal: 1,
        weeklyTarget: 5,
        badgeThresholds: [1, 10, 50, 100],
        streakThresholds: [3, 7, 21],
        version: '1.0.0',
        maintenanceMode: false
      }
    }
  } catch (err) {
    console.error('获取应用配置失败:', err)
    return {
      success: false,
      errorCode: 'DB_ERROR',
      errorMessage: err.message || '获取应用配置失败',
      data: null
    }
  }
}
