/**
 * ASR 转写后处理工具
 * 清洗 ASR 输出，减少重复、口头禅、碎片，提升 LLM 输入质量
 * Phase 7-F: 增强防御性错误处理
 */

// 常见中文口头禅 / 填充词
const FILLER_WORDS = ['嗯', '呃', '啊', '额', '哦', '唉', '哎', '哈', '呢'];

// 常见连续口头禅短语
const FILLER_PHRASES = [
  '这个这个', '那个那个', '然后然后', '就是就是',
  '对对对', '是是是', '好好好', '嗯嗯嗯',
  '所以所以', '因为因为', '但是但是',
];

/**
 * 去除连续重复的中文短语（2-8字）
 * 使用安全的字符串操作代替 regex backreference
 */
function deduplicateRepeatedPhrases(text) {
  if (!text || text.length < 4) return text;

  let result = text;
  // 从长到短匹配重复片段
  for (let len = 8; len >= 2; len--) {
    let changed = true;
    let safety = 0;
    while (changed && safety < 10) {
      changed = false;
      safety++;
      let newResult = '';
      let i = 0;
      while (i < result.length) {
        if (i + len * 2 <= result.length) {
          const seg1 = result.substring(i, i + len);
          const seg2 = result.substring(i + len, i + len * 2);
          if (seg1 === seg2) {
            // 找到重复，跳过第二个
            newResult += seg1;
            i += len * 2;
            // 继续检查是否还有更多重复
            while (i + len <= result.length && result.substring(i, i + len) === seg1) {
              i += len;
            }
            changed = true;
            continue;
          }
        }
        newResult += result[i];
        i++;
      }
      result = newResult;
    }
  }

  return result;
}

/**
 * 去除连续重复的单词/词组（标点分隔的情况）
 * 使用安全的字符串操作
 */
function deduplicateWithSeparators(text) {
  if (!text) return text;

  let result = text;
  // "X，X" 模式（X是1-6字中文）
  for (let len = 6; len >= 1; len--) {
    const sepPattern = /[，,、。；;\s]+/;
    let changed = true;
    let safety = 0;
    while (changed && safety < 10) {
      changed = false;
      safety++;
      for (let i = 0; i + len < result.length; i++) {
        const seg = result.substring(i, i + len);
        // 检查是否全是中文
        if (!/^[一-鿿]+$/.test(seg)) continue;
        // 找到分隔符
        let sepEnd = i + len;
        while (sepEnd < result.length && sepPattern.test(result[sepEnd])) {
          sepEnd++;
        }
        if (sepEnd === i + len) continue; // 没有分隔符
        // 检查分隔符后是否是同样的文本
        if (result.substring(sepEnd, sepEnd + len) === seg) {
          result = result.substring(0, i + len) + result.substring(sepEnd + len);
          changed = true;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * 清理口头禅和填充词
 */
function removeFillerWords(text) {
  if (!text) return text;

  let result = text;

  // 去除连续重复的填充词短语
  for (const phrase of FILLER_PHRASES) {
    try {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped + '+', 'g');
      result = result.replace(re, phrase.substring(0, phrase.length / 2));
    } catch (e) {
      // 跳过有误的正则
    }
  }

  // 去除句首/逗号后的孤立填充词
  for (const word of FILLER_WORDS) {
    try {
      // 句首的填充词
      result = result.replace(new RegExp(`^${word}[，,、\\s]+`, 'g'), '');
      // 逗号后的填充词（使用函数替代 $1 backreference 以避免潜在问题）
      result = result.replace(
        new RegExp(`([，,。；;])${word}[，,、\\s]*`, 'g'),
        (match, p1) => p1,
      );
    } catch (e) {
      // 跳过有误的正则
    }
  }

  return result;
}

/**
 * 标点归一化
 */
function normalizePunctuation(text) {
  if (!text) return text;

  let result = text;

  // 多个逗号合并
  result = result.replace(/[，,]{2,}/g, '，');
  // 多个句号合并
  result = result.replace(/[。.]{2,}/g, '。');
  // 多个分号合并
  result = result.replace(/[；;]{2,}/g, '；');
  // 去除多余空格
  result = result.replace(/\s{2,}/g, ' ');
  // 标点前后空格归一（使用函数代替 $1 backreference）
  result = result.replace(/\s+([，,。.；;！!？?])/g, (match, p1) => p1);
  result = result.replace(/([，,。.；;！!？?])\s+/g, (match, p1) => p1 + ' ');

  // 去除开头的标点
  result = result.replace(/^[，,。.；;、\s]+/, '');

  return result.trim();
}

/**
 * 合并太短的 segment（少于8个字且不是句末）
 */
function mergeShortSegments(segments) {
  if (!segments || segments.length <= 1) return segments;

  const merged = [];
  let i = 0;

  while (i < segments.length) {
    const current = { ...segments[i] };
    const text = (current.text || '').trim();

    // 如果当前 segment 太短且不是最后一个，尝试向后合并
    if (text.length < 8 && i < segments.length - 1) {
      const next = segments[i + 1];
      current.text = text + (next.text || '');
      current.endTime = next.endTime || current.endTime;
      i += 2; // 跳过下一个
    } else {
      i += 1;
    }

    merged.push(current);
  }

  return merged;
}

/**
 * 主清洗函数：清洗全文
 * @param {string} text - 原始 ASR 全文
 * @returns {string} 清洗后的文本
 */
function cleanTranscriptText(text) {
  if (text == null) return '';
  if (typeof text !== 'string') return String(text);

  try {
    let result = text;

    // Step 1: 去重复短语
    result = deduplicateRepeatedPhrases(result);
    result = deduplicateWithSeparators(result);

    // Step 2: 去口头禅
    result = removeFillerWords(result);

    // Step 3: 标点归一
    result = normalizePunctuation(result);

    // Step 4: 最终去重（可能清理后暴露新的重复）
    result = deduplicateRepeatedPhrases(result);

    return result.trim();
  } catch (err) {
    console.warn('[transcript-cleaner] cleanTranscriptText failed, returning raw text:', err.message);
    return text.trim();
  }
}

/**
 * 主清洗函数：清洗 segments 数组
 * @param {Array} segments - [{ text, timestampMs, beginTime, endTime }]
 * @returns {Array} 清洗后的 segments
 */
function cleanTranscriptSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return segments || [];

  try {
    // Step 1: 合并太短的 segment
    let cleaned = mergeShortSegments(segments);

    // Step 2: 对每个 segment 的 text 做清洗
    cleaned = cleaned.map(seg => ({
      ...seg,
      text: cleanTranscriptText(seg.text || ''),
      originalText: seg.text, // 保留原始文本
    }));

    // Step 3: 过滤掉清洗后为空的 segment
    cleaned = cleaned.filter(seg => seg.text && seg.text.trim().length > 0);

    return cleaned;
  } catch (err) {
    console.warn('[transcript-cleaner] cleanTranscriptSegments failed, returning raw segments:', err.message);
    return segments;
  }
}

module.exports = { cleanTranscriptText, cleanTranscriptSegments };
