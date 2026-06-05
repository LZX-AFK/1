(function() {
'use strict';

// 调试信息
console.log('test-app.js 已加载，时间:', new Date().toLocaleTimeString());

// 直接写死地址，排除 window.location 推导错误
var API_BASE = 'http://localhost:3000/api';
var WS_BASE = 'ws://localhost:3000';

console.log('API_BASE:', API_BASE);
console.log('WS_BASE:', WS_BASE);

// 状态变量
var currentSessionId = null;
var ws = null;
var mediaStream = null;
var audioContext = null;
var sourceNode = null;
var processorNode = null;
var isRecording = false;
var markersList = [];
var recordingStartTime = null;
var summaryPollingInterval = null;

// DOM 元素 - 放在 body 底部执行，此时元素肯定存在
var startBtn = document.getElementById('startBtn');
var stopBtn = document.getElementById('stopBtn');
var markerPanel = document.getElementById('markerPanel');
var transcriptArea = document.getElementById('transcriptArea');
var sessionIdSpan = document.getElementById('sessionIdDisplay');
var markerInfoDiv = document.getElementById('markerInfo');
var summaryArea = document.getElementById('summaryArea');
var volumeIconSpan = document.getElementById('volumeIcon');
var backendUrlEl = document.getElementById('backendUrl');

console.log('DOM 元素查找:', 
  'startBtn:', !!startBtn, 
  'stopBtn:', !!stopBtn,
  'markerPanel:', !!markerPanel
);

if (backendUrlEl) backendUrlEl.innerText = 'localhost:3000';

if (!startBtn || !stopBtn) {
  console.error('❌ 找不到按钮元素！');
  return;
}

function showToast(message, isError) {
    var toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#dc2626' : '#333';
    toast.style.opacity = '1';
    setTimeout(function() { toast.style.opacity = '0'; }, 3000);
}

function updateMarkerDisplay() {
    if (markersList.length === 0) {
        markerInfoDiv.innerHTML = '标记记录: 暂无';
    } else {
        var html = '标记记录: ';
        for (var i = 0; i < markersList.length; i++) {
            var m = markersList[i];
            var labelText = '';
            if (m.label === 'important') labelText = '重要';
            else if (m.label === 'didnt_understand') labelText = '没听懂';
            else labelText = '疑问';
            html += '[' + m.timestampMs + 'ms ' + labelText + '] ';
        }
        markerInfoDiv.innerHTML = html;
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function addTranscript(text, isFinal) {
    var line = document.createElement('div');
    line.className = 'transcript-line';
    line.innerHTML = '<span style="color: #a5f3c3;">' + (isFinal ? 'V' : '.') + '</span> ' + escapeHtml(text);
    transcriptArea.appendChild(line);
    while (transcriptArea.children.length > 100) transcriptArea.removeChild(transcriptArea.firstChild);
    line.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function resetUI() {
    transcriptArea.innerHTML = '<div style="color: #94a3b8;">等待课堂开始...</div>';
    summaryArea.innerHTML = '';
    markersList = [];
    updateMarkerDisplay();
    if (volumeIconSpan) volumeIconSpan.innerHTML = '🎤';
}

function startPollingSummary(sessionId) {
    if (summaryPollingInterval) clearInterval(summaryPollingInterval);
    summaryArea.innerHTML = '<div style="padding: 12px; background: #f3f4f6; border-radius: 16px;">AI 正在为你生成课堂笔记，请稍等...</div>';
    var attempts = 0;
    var maxAttempts = 20;
    summaryPollingInterval = setInterval(function() {
        attempts++;
        fetch(API_BASE + '/sessions/' + sessionId + '/summary').then(function(res) { return res.json(); }).then(function(json) {
            if (json.code === 200 && json.data && json.data.content) {
                clearInterval(summaryPollingInterval);
                summaryPollingInterval = null;
                var summary = json.data;
                var html = '<h3>AI 课堂笔记</h3><div class="summary-box">';
                html += '<strong>内容摘要</strong><br>' + escapeHtml(summary.content).replace(/\n/g, '<br>');
                if (summary.keyPoints && summary.keyPoints.length > 0) {
                    html += '<br><br><strong>关键词</strong><br>';
                    for (var k = 0; k < summary.keyPoints.length; k++) {
                        html += '&#9656; ' + escapeHtml(summary.keyPoints[k]) + '<br>';
                    }
                }
                html += '</div>';
                summaryArea.innerHTML = html;
                showToast('AI 课堂笔记已生成！');
            } else if (attempts >= maxAttempts) {
                clearInterval(summaryPollingInterval);
                summaryPollingInterval = null;
                summaryArea.innerHTML = '<div class="summary-box" style="background:#fee2e2;">总结生成超时，请稍后再试。</div>';
            }
        }).catch(function() {
            if (attempts >= maxAttempts) {
                clearInterval(summaryPollingInterval);
                summaryPollingInterval = null;
            }
        });
    }, 2000);
}

function endSession() {
    if (!currentSessionId) return;
    console.log('结束课堂:', currentSessionId);
    stopBtn.disabled = true;
    startBtn.disabled = false;
    markerPanel.style.display = 'none';
    isRecording = false;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop' }));
        ws.close();
    }
    if (audioContext) { audioContext.close().catch(function(){}); }
    if (mediaStream) { mediaStream.getTracks().forEach(function(track) { track.stop(); }); }

    fetch(API_BASE + '/sessions/' + currentSessionId + '/end', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    }).then(function(res) { return res.json(); }).then(function(json) {
        console.log('结束课堂响应:', json);
        if (json.code === 200) {
            addTranscript('【课堂已结束，正在请求 AI 总结...】', true);
            startPollingSummary(currentSessionId);
        } else {
            addTranscript('结束课堂失败: ' + json.message, true);
            showToast('结束课堂失败: ' + json.message, true);
        }
    }).catch(function(err) {
        console.error('结束课堂错误:', err);
        addTranscript('结束课堂请求失败: ' + err.message, true);
        showToast('后端可能未启动', true);
    });
}

function addMarker(label, note) {
    if (!currentSessionId || !isRecording) {
        showToast('请先开始课堂', true);
        return;
    }
    var timestampMs = Date.now() - recordingStartTime;
    fetch(API_BASE + '/sessions/' + currentSessionId + '/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestampMs: timestampMs, label: label, note: note || '' })
    }).then(function(res) { return res.json(); }).then(function(json) {
        if (json.code === 200) {
            markersList.push({ timestampMs: timestampMs, label: label, note: note });
            updateMarkerDisplay();
            addTranscript('标记: ' + label + ' (' + timestampMs + 'ms)', true);
        } else {
            showToast('标记失败: ' + json.message, true);
        }
    }).catch(function(err) {
        showToast('标记请求失败: ' + err.message, true);
    });
}

function createSession() {
    console.log('创建课堂... POST', API_BASE + '/sessions');
    return fetch(API_BASE + '/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '实时课堂测试', subject: 'Demo' })
    }).then(function(res) {
        console.log('创建课堂响应状态:', res.status);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }).then(function(json) {
        console.log('创建课堂响应体:', json);
        if (json.code !== 200) throw new Error(json.message);
        return json.data.sessionId;
    });
}

function setupWebSocket(sessionId) {
    console.log('连接 WebSocket:', WS_BASE + '/ws/session/' + sessionId + '/audio');
    return new Promise(function(resolve, reject) {
        var socket = new WebSocket(WS_BASE + '/ws/session/' + sessionId + '/audio');
        var timeout = setTimeout(function() { reject(new Error('WebSocket 连接超时')); }, 5000);
        socket.onopen = function() {
            clearTimeout(timeout);
            console.log('WebSocket 已连接');
            resolve(socket);
        };
        socket.onerror = function(err) { 
            clearTimeout(timeout); 
            console.error('WebSocket 错误:', err);
            reject(new Error('WebSocket 连接失败')); 
        };
        socket.onclose = function(event) {
            console.log('WebSocket 关闭, code:', event.code, 'clean:', event.wasClean);
            if (!event.wasClean) {
                startBtn.disabled = false;
                stopBtn.disabled = true;
                markerPanel.style.display = 'none';
                isRecording = false;
                showToast('WebSocket 连接已断开，请重新开始课堂', true);
            }
        };
        socket.onmessage = function(event) {
            try {
                var msg = JSON.parse(event.data);
                if (msg.type === 'transcript' && msg.text) addTranscript(msg.text, msg.isFinal);
                else if (msg.type === 'error') {
                    // Deepgram 错误只提示一次，不污染字幕区
                    showToast('语音识别服务暂时不可用，但标记和AI总结功能正常', false);
                }
            } catch (e) {}
        };
    });
}

function startMicrophoneStream(sessionStartTime) {
    console.log('请求麦克风权限...');
    return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    }).then(function(stream) {
        console.log('麦克风已授权');
        mediaStream = stream;
        var context = new (window.AudioContext || window.webkitAudioContext)();
        audioContext = context;
        var source = context.createMediaStreamSource(stream);
        sourceNode = source;
        var processor = context.createScriptProcessor(4096, 1, 1);
        processorNode = processor;
        source.connect(processor);
        processor.connect(context.destination);
        processor.onaudioprocess = function(e) {
            if (!isRecording) return;
            var inputData = e.inputBuffer.getChannelData(0);
            var sourceRate = context.sampleRate;
            var targetRate = 16000;
            var ratio = sourceRate / targetRate;
            if (ratio <= 0) return;
            var outLength = Math.floor(inputData.length / ratio);
            var pcmInt16 = new Int16Array(outLength);
            for (var i = 0; i < outLength; i++) {
                var srcIndex = Math.floor(i * ratio);
                if (srcIndex >= inputData.length) break;
                var sample = inputData[srcIndex];
                sample = Math.max(-1.0, Math.min(1.0, sample));
                pcmInt16[i] = Math.floor(sample * 32767);
            }
            var sum = 0;
            for (var j = 0; j < pcmInt16.length; j++) sum += Math.abs(pcmInt16[j]);
            var avg = sum / pcmInt16.length;
            if (avg > 1000) volumeIconSpan.innerHTML = '🔊';
            else if (avg > 100) volumeIconSpan.innerHTML = '🔉';
            else volumeIconSpan.innerHTML = '🎤';
            if (ws && ws.readyState === WebSocket.OPEN) {
                var timestamp = Date.now() - sessionStartTime;
                var pcmBytes = new Uint8Array(pcmInt16.buffer);
                var frame = new Uint8Array(5 + pcmBytes.length);
                frame[0] = 0x01;
                var view = new DataView(frame.buffer);
                view.setUint32(1, timestamp, false);
                frame.set(pcmBytes, 5);
                ws.send(frame);
            }
        };
        return context.resume().then(function() { return true; });
    });
}

var startClass = function() {
    console.log('=== startClass 被调用 ===');
    resetUI();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    markerPanel.style.display = 'flex';
    isRecording = false;

    createSession().then(function(sessionId) {
        console.log('课堂创建成功:', sessionId);
        currentSessionId = sessionId;
        sessionIdSpan.innerText = '课堂ID: ' + sessionId.substring(0, 8) + '...';
        recordingStartTime = Date.now();
        return setupWebSocket(sessionId);
    }).then(function(socket) {
        ws = socket;
        // 等 Deepgram 就绪后再开始录音
        return new Promise(function(resolve, reject) {
            var readyTimeout = setTimeout(function() {
                reject(new Error('Deepgram 连接超时（10秒），请检查 API Key 和网络'));
            }, 10000);
            
            var origOnMessage = ws.onmessage;
            ws.onmessage = function(event) {
                try {
                    var msg = JSON.parse(event.data);
                    if (msg.type === 'ready') {
                        clearTimeout(readyTimeout);
                        console.log('Deepgram 已就绪，开始录音');
                        ws.onmessage = origOnMessage; // 恢复原始handler
                        addTranscript('语音识别服务已就绪，请说话...', true);
                        startMicrophoneStream(recordingStartTime).then(resolve, reject);
                        return;
                    }
                } catch(e) {}
                // 非ready消息，交给原始handler
                if (origOnMessage) origOnMessage.call(ws, event);
            };
        });
    }).then(function() {
        isRecording = true;
        showToast('课堂已开始！');
    }).catch(function(err) {
        console.error('startClass 错误:', err);
        var errorMsg = err.message || String(err);
        console.log('原始错误信息:', errorMsg);
        if (err.name === 'NotAllowedError' || errorMsg.includes('Permission')) {
            errorMsg = '麦克风权限被拒绝，请在浏览器地址栏左侧点击🔒图标，开启麦克风权限。';
        } else if (errorMsg.includes('fetch') || errorMsg.includes('HTTP') || errorMsg.includes('NetworkError')) {
            errorMsg = '无法连接后端服务。请确认：\n1. 已在终端运行 npm start\n2. 浏览器访问的是 http://localhost:3000/test.html';
        } else if (errorMsg.includes('WebSocket')) {
            errorMsg = 'WebSocket 连接失败，后端服务可能未正常运行。';
        }
        showToast('启动失败: ' + errorMsg, true);
        startBtn.disabled = false;
        stopBtn.disabled = true;
        markerPanel.style.display = 'none';
        isRecording = false;
        if (ws) ws.close();
        if (mediaStream) mediaStream.getTracks().forEach(function(t) { t.stop(); });
    });
};

console.log('test-app.js 初始化完成 ✅');

// 脚本在 body 底部，DOM 已就绪，直接绑定事件
startBtn.addEventListener('click', startClass);
stopBtn.addEventListener('click', endSession);

document.querySelectorAll('.marker-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var label = btn.dataset.label;
    var note = '';
    if (label === 'important') note = '重要知识点';
    if (label === 'didnt_understand') note = '没听懂的部分';
    if (label === 'question') note = '需要复习';
    addMarker(label, note);
  });
});

console.log('事件绑定完成 ✅');

// ========== 历史课堂功能 ==========

var historyList = document.getElementById('historyList');
var searchInput = document.getElementById('searchInput');
var searchBtn = document.getElementById('searchBtn');
var refreshHistoryBtn = document.getElementById('refreshHistoryBtn');

var STATUS_LABELS = {
    recording: '录制中',
    summarizing: '生成中',
    done: '已完成',
    failed: '失败',
};
var STATUS_CLASSES = {
    recording: 'status-recording',
    summarizing: 'status-summarizing',
    done: 'status-done',
    failed: 'status-failed',
};

function fmtDuration(ms) {
    if (!ms) return '—';
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = String(s % 60).padStart(2, '0');
    return m + ':' + sec;
}

function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
        + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function renderHistory(sessions) {
    if (!sessions || sessions.length === 0) {
        historyList.innerHTML = '<div class="empty-tip">暂无课堂记录</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        var statusLabel = STATUS_LABELS[s.status] || s.status;
        var statusClass = STATUS_CLASSES[s.status] || 'status-failed';
        html += '<div class="history-item" data-id="' + escapeHtml(s.id) + '">';
        html += '<div>';
        html += '<div class="history-title">' + escapeHtml(s.title || '未命名课堂') + '</div>';
        html += '<div class="history-meta">'
            + (s.subject ? '科目: ' + escapeHtml(s.subject) + ' &nbsp;|&nbsp; ' : '')
            + '时间: ' + fmtDate(s.startedAt) + ' &nbsp;|&nbsp; '
            + '时长: ' + fmtDuration(s.durationMs)
            + '</div>';
        html += '</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
        html += '<span class="history-status ' + statusClass + '">' + statusLabel + '</span>';
        html += '<div class="history-actions">';
        // 导出 Markdown
        html += '<button class="btn-green export-md-btn" data-id="' + escapeHtml(s.id) + '" data-title="' + escapeHtml(s.title||'课堂') + '" style="padding:6px 12px;font-size:12px;">导出 MD</button>';
        // 导出 TXT
        html += '<button class="btn-secondary export-txt-btn" data-id="' + escapeHtml(s.id) + '" data-title="' + escapeHtml(s.title||'课堂') + '" style="padding:6px 12px;font-size:12px;">导出 TXT</button>';
        // 删除
        html += '<button class="btn-danger delete-btn" data-id="' + escapeHtml(s.id) + '" style="padding:6px 12px;font-size:12px;">删除</button>';
        html += '</div></div>';
        html += '</div>';
    }
    historyList.innerHTML = html;

    // 绑定导出按钮
    historyList.querySelectorAll('.export-md-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            exportSession(btn.dataset.id, 'md');
        });
    });
    historyList.querySelectorAll('.export-txt-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            exportSession(btn.dataset.id, 'txt');
        });
    });
    // 绑定删除按钮
    historyList.querySelectorAll('.delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            deleteSession(btn.dataset.id);
        });
    });
}

function loadHistory(q) {
    var url = API_BASE + '/sessions';
    if (q && q.trim()) url += '?q=' + encodeURIComponent(q.trim());
    historyList.innerHTML = '<div class="empty-tip">加载中...</div>';
    fetch(url).then(function(res) { return res.json(); }).then(function(json) {
        if (json.code === 200) {
            renderHistory(json.data);
        } else {
            historyList.innerHTML = '<div class="empty-tip" style="color:#ef4444;">加载失败: ' + escapeHtml(json.message) + '</div>';
        }
    }).catch(function(err) {
        historyList.innerHTML = '<div class="empty-tip" style="color:#ef4444;">网络错误，请确认后端已启动</div>';
    });
}

function exportSession(id, format) {
    var url = API_BASE + '/sessions/' + id + '/export?format=' + format;
    // 用 <a> 触发浏览器下载
    var a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('正在下载 ' + format.toUpperCase() + ' 文件...');
}

function deleteSession(id) {
    if (!confirm('确认删除这条课堂记录？（包含转写、标记和 AI 总结，操作不可撤销）')) return;
    fetch(API_BASE + '/sessions/' + id, { method: 'DELETE' })
        .then(function(res) { return res.json(); })
        .then(function(json) {
            if (json.code === 200) {
                showToast('已删除');
                // 移除对应 DOM
                var item = historyList.querySelector('[data-id="' + id + '"]');
                if (item) item.remove();
                if (historyList.children.length === 0) {
                    historyList.innerHTML = '<div class="empty-tip">暂无课堂记录</div>';
                }
            } else {
                showToast('删除失败: ' + json.message, true);
            }
        }).catch(function() {
            showToast('删除请求失败', true);
        });
}

// 搜索按钮
searchBtn.addEventListener('click', function() {
    loadHistory(searchInput.value);
});
// 回车搜索
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loadHistory(searchInput.value);
});
// 刷新按钮
refreshHistoryBtn.addEventListener('click', function() {
    searchInput.value = '';
    loadHistory('');
});
// 页面初始化时自动加载
loadHistory('');

console.log('历史课堂功能已初始化 ✅');

})();
