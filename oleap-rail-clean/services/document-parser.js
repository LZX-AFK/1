/**
 * Document Parser — Extract text from PDF files
 * Uses pdf2json for robust CJS-compatible PDF text extraction
 * Supports: PDF (.pdf)
 * Does NOT support: PPT/PPTX (returns PPT_PARSE_NOT_SUPPORTED)
 */

const fs = require('fs');
const path = require('path');

let PDFParser = null;
try {
  PDFParser = require('pdf2json');
} catch (e) {
  console.warn('[document-parser] pdf2json not installed. PDF parsing will not work.');
}

/**
 * Parse a document file and extract text
 */
async function parseDocument(filePath, mimeType, extension) {
  const ext = (extension || '').toLowerCase();

  if (ext === '.pdf') {
    return parsePDF(filePath);
  }

  if (ext === '.ppt' || ext === '.pptx') {
    const err = new Error('PPT/PPTX parsing is not supported yet. Please upload PDF slides.');
    err.code = 'PPT_PARSE_NOT_SUPPORTED';
    throw err;
  }

  const err = new Error(`Unsupported document format: ${ext}`);
  err.code = 'UNSUPPORTED_DOCUMENT_TYPE';
  throw err;
}

/**
 * Parse PDF file using pdf2json
 */
function parsePDF(filePath) {
  return new Promise((resolve, reject) => {
    if (!PDFParser) {
      const err = new Error('PDF parsing library not available.');
      err.code = 'PDF_PARSE_FAILED';
      return reject(err);
    }

    if (!fs.existsSync(filePath)) {
      const err = new Error(`File not found: ${filePath}`);
      err.code = 'PDF_PARSE_FAILED';
      return reject(err);
    }

    const parser = new PDFParser();

    parser.on('pdfParser_dataError', (errData) => {
      const err = new Error(`PDF parse failed: ${errData.parserError || 'unknown error'}`);
      err.code = 'PDF_PARSE_FAILED';
      reject(err);
    });

    parser.on('pdfParser_dataReady', (data) => {
      try {
        const pdfPages = data.Pages || [];
        const pages = [];
        const allTextParts = [];

        for (let i = 0; i < pdfPages.length; i++) {
          const texts = pdfPages[i].Texts || [];
          const pageText = texts
            .map(t => {
              const raw = t.R?.[0]?.T || '';
              return decodeURIComponent(raw);
            })
            .join(' ')
            .trim();

          if (pageText) {
            pages.push({ pageNumber: i + 1, text: pageText });
            allTextParts.push(pageText);
          }
        }

        const fullText = allTextParts.join('\n\n').trim();

        if (!fullText || fullText.length < 10) {
          const err = new Error('No readable text found in PDF. The PDF may be image-based or scanned.');
          err.code = 'DOCUMENT_TEXT_EMPTY';
          return reject(err);
        }

        // Extract title from first line
        let title = '';
        const firstLine = fullText.split('\n')[0]?.trim() || '';
        if (firstLine.length > 2 && firstLine.length < 200) {
          title = firstLine;
        }

        resolve({
          text: fullText,
          pages,
          metadata: {
            pageCount: pdfPages.length,
            title,
          },
        });
      } catch (parseErr) {
        const err = new Error(`PDF text extraction failed: ${parseErr.message}`);
        err.code = 'PDF_PARSE_FAILED';
        reject(err);
      }
    });

    try {
      parser.loadPDF(filePath);
    } catch (loadErr) {
      const err = new Error(`PDF load failed: ${loadErr.message}`);
      err.code = 'PDF_PARSE_FAILED';
      reject(err);
    }
  });
}

/**
 * Clean document text for DeepSeek input
 */
function cleanDocumentText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  cleaned = cleaned.replace(/\f/g, '\n');
  cleaned = cleaned.replace(/^(?:Page\s*)?\d{1,4}\s*$/gim, '');
  cleaned = cleaned.replace(/^[-–—]\s*\d{1,4}\s*[-–—]\s*$/gim, '');
  cleaned = cleaned.replace(/^[-=_]{3,}\s*$/gim, '');
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

  return cleaned.trim();
}

/**
 * Truncate document text for DeepSeek input
 */
function truncateForSummary(text, maxLength = 12000) {
  if (!text || text.length <= maxLength) {
    return { text: text || '', truncated: false };
  }

  const headSize = Math.floor(maxLength * 0.67);
  const tailSize = maxLength - headSize;

  const head = text.substring(0, headSize);
  const tail = text.substring(text.length - tailSize);

  return {
    text: head + '\n\n[... 文档中间部分已省略 ...]\n\n' + tail,
    truncated: true,
  };
}

module.exports = {
  parseDocument,
  cleanDocumentText,
  truncateForSummary,
};
