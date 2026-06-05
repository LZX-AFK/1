/**
 * Document Upload API — Phase 9-A
 * POST /api/sessions/upload-document
 * Upload PDF/Reading/Lecture Slides → extract text → DeepSeek summary
 */

import { getApiBaseUrl } from './api';

export interface UploadDocumentOptions {
  documentType: 'reading' | 'slides';
  courseName?: string;
  subject?: string;
  source?: string;
  language?: string;
  title?: string;
  spaceId?: string;
  spaceName?: string;
  spaceType?: string;
}

export interface UploadDocumentResult {
  sessionId: string;
  status: 'processing' | 'done';
  source: string;
  documentType: string;
}

/**
 * Upload a learning document (PDF) to the backend for parsing and summary generation
 * Uses uni.uploadFile for H5 compatibility
 */
export function uploadLearningDocument(
  filePath: string,
  options: UploadDocumentOptions,
): Promise<UploadDocumentResult> {
  return new Promise((resolve, reject) => {
    const uploadTask = uni.uploadFile({
      url: `${getApiBaseUrl()}/api/sessions/upload-document`,
      filePath,
      name: 'file',
      formData: {
        documentType: options.documentType || 'reading',
        courseName: options.courseName || '上传资料',
        subject: options.subject || 'document',
        source: options.source || `upload-${options.documentType}`,
        language: options.language || 'auto',
        summaryLanguage: 'zh',
        title: options.title || '',
        ...(options.spaceId ? { spaceId: options.spaceId } : {}),
        ...(options.spaceName ? { spaceName: options.spaceName } : {}),
        ...(options.spaceType ? { spaceType: options.spaceType } : {}),
      },
      success(res) {
        if (res.statusCode !== 200) {
          try {
            const body = JSON.parse(res.data);
            reject(new Error(body.message || body.error || '上传失败'));
          } catch {
            reject(new Error(`上传失败 (${res.statusCode})`));
          }
          return;
        }

        try {
          const body = JSON.parse(res.data);
          if (body.ok === false || body.code >= 400) {
            reject(new Error(body.message || body.error || '上传失败'));
            return;
          }
          resolve(body.data as UploadDocumentResult);
        } catch {
          reject(new Error('解析服务器响应失败'));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });

    // Track upload progress if needed
    uploadTask.onProgressUpdate((res) => {
      console.log('[documentApi] upload progress:', res.progress + '%');
    });
  });
}

/**
 * Supported document file extensions
 */
export const DOCUMENT_ACCEPT_READING = '.pdf';
export const DOCUMENT_ACCEPT_SLIDES = '.pdf';

/**
 * Max file size: 50MB
 */
export const DOCUMENT_MAX_SIZE = 50 * 1024 * 1024;

/**
 * Error code → user-facing message mapping
 */
export const DOCUMENT_ERROR_MESSAGES: Record<string, string> = {
  FILE_REQUIRED: '请选择要上传的文件。',
  FILE_TOO_LARGE: '文件过大，请选择 50MB 以内的文档。',
  UNSUPPORTED_DOCUMENT_TYPE: '暂不支持该文件格式，请上传 PDF 文件。',
  PDF_PARSE_FAILED: 'PDF 解析失败，请换一个可复制文本的 PDF。',
  PPT_PARSE_NOT_SUPPORTED: 'PPT 解析将在下一阶段接入，请先上传 PDF 版课件。',
  DOCUMENT_TEXT_EMPTY: '未能从文档中提取到有效文本。',
  DOCUMENT_TEXT_TOO_SHORT: '文档内容过短，无法生成学习总结。',
  DOCUMENT_SUMMARY_FAILED: '文档总结生成失败，请稍后重试。',
  DEEPSEEK_NOT_CONFIGURED: 'DeepSeek 未配置，请检查后端环境变量。',
  DEEPSEEK_PROCESS_FAILED: '文档总结生成失败，请稍后重试。',
  UPLOAD_DOCUMENT_FAILED: '上传解析失败，请稍后重试。',
};
