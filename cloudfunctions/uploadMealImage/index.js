const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 上传食物照片到云存储
 * @param {Object} event
 * @param {string} event.tempFilePath - wx.chooseMedia 返回的临时文件路径
 * @returns {{ imageFileID, imageUrl }}
 */
exports.main = async (event, context) => {
  const { tempFilePath } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errorCode: 'NOT_LOGGED_IN', errorMessage: '用户未登录', data: null }
  }

  if (!tempFilePath) {
    return { success: false, errorCode: 'MISSING_FILE', errorMessage: '缺少临时文件路径', data: null }
  }

  try {
    // 从临时文件读取内容
    const fs = require('fs')
    const fileContent = fs.readFileSync(tempFilePath)

    // 生成云存储路径
    const timestamp = Date.now()
    const ext = tempFilePath.split('.').pop() || 'jpg'
    const cloudPath = `meals/${openid}/${timestamp}.${ext}`

    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent
    })

    // 获取可访问的临时 URL（有效期 1 天）
    let imageUrl = null
    try {
      const urlRes = await cloud.getTempFileURL({
        fileList: [uploadRes.fileID]
      })
      if (urlRes.fileList && urlRes.fileList[0]) {
        imageUrl = urlRes.fileList[0].tempFileURL
      }
    } catch (urlErr) {
      console.warn('获取临时 URL 失败:', urlErr.message)
    }

    return {
      success: true,
      data: {
        imageFileID: uploadRes.fileID,
        imageUrl
      }
    }
  } catch (err) {
    console.error('uploadMealImage 失败:', err)
    return {
      success: false,
      errorCode: 'UPLOAD_FAILED',
      errorMessage: err.message || '图片上传失败',
      data: null
    }
  }
}
