(function() {
'use strict';

var BASE = window.location.origin;
var currentSessionId = '';

var $ = function(id) { return document.getElementById(id); };

var setStatus = function(id, type, text) {
  var el = $(id);
  if (!el) return;
  el.className = 'status ' + type;
  el.textContent = text;
};

var setResponse = function(id, data, isErr) {
  var el = $(id);
  if (!el) return;
  el.value = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  el.className = 'response' + (isErr ? ' error' : ' success');
};

var setSessionId = function(id) {
  currentSessionId = id;
  var display = $('sessionDisplay');
  if (display) display.style.display = 'block';
  var val = $('sessionIdValue');
  if (val) val.textContent = id;
  var inputs = ['markerSessionId','markerListSessionId','endSessionId','summarySessionId','detailId'];
  for (var i = 0; i < inputs.length; i++) {
    var el = $(inputs[i]);
    if (el) el.value = id;
  }
};

var api = function(method, path, body) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, BASE + path, true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (body) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.timeout = 10000;
    xhr.onload = function() {
      var text = xhr.responseText;
      try {
        resolve({ status: xhr.status, data: JSON.parse(text) });
      } catch(e) {
        resolve({ status: xhr.status, data: text });
      }
    };
    xhr.onerror = function() { reject(new Error('网络错误')); };
    xhr.ontimeout = function() { reject(new Error('请求超时')); };
    xhr.send(body ? JSON.stringify(body) : null);
  });
};

var updateFlowStep = function(step) {
  for (var i = 1; i <= 4; i++) {
    var el = $('step' + i);
    if (!el) continue;
    if (i < step) { el.className = 'step done'; el.textContent = 'V'; }
    else if (i === step) { el.className = 'step active'; el.textContent = i; }
    else { el.className = 'step pending'; el.textContent = i; }
  }
};

// ====== 各接口测试函数 ======

window.testHealth = function(btn) {
  setStatus('healthStatus', 'loading', '测试中...');
  api('GET', '/health').then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('healthStatus', 'success', '正常');
    } else {
      setStatus('healthStatus', 'error', '异常');
    }
    setResponse('createResponse', res.data);
  }).catch(function(e) {
    setStatus('healthStatus', 'error', '连接失败');
    setResponse('createResponse', e.message, true);
  });
};

window.testCreateSession = function(btn) {
  setStatus('createStatus', 'loading', '创建中...');
  var title = ($('createTitle') && $('createTitle').value) || '物理课';
  var subject = ($('createSubject') && $('createSubject').value) || 'Physics';
  api('POST', '/api/sessions', { title: title, subject: subject }).then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('createStatus', 'success', '已创建');
      setResponse('createResponse', res.data);
      if (res.data.data && res.data.data.sessionId) {
        setSessionId(res.data.data.sessionId);
        updateFlowStep(1);
      }
    } else {
      setStatus('createStatus', 'error', '失败');
      setResponse('createResponse', res.data, true);
    }
  }).catch(function(e) {
    setStatus('createStatus', 'error', '连接失败');
    setResponse('createResponse', e.message, true);
  });
};

window.testListSessions = function(btn) {
  setStatus('listStatus', 'loading', '查询中...');
  api('GET', '/api/sessions').then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('listStatus', 'success', res.data.data.length + ' 条');
    } else {
      setStatus('listStatus', 'error', '失败');
    }
    setResponse('listResponse', res.data);
  }).catch(function(e) {
    setStatus('listStatus', 'error', '连接失败');
    setResponse('listResponse', e.message, true);
  });
  var body = $('listResponse');
  if (body && body.parentElement) body.parentElement.classList.toggle('open');
};

window.testSessionDetail = function(btn) {
  var id = ($('detailId') && $('detailId').value) || currentSessionId;
  if (!id) { alert('请先创建课堂'); return; }
  setStatus('detailStatus', 'loading', '查询中...');
  api('GET', '/api/sessions/' + id).then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('detailStatus', 'success', '成功');
    } else {
      setStatus('detailStatus', 'error', '失败');
    }
    setResponse('detailResponse', res.data);
  }).catch(function(e) {
    setStatus('detailStatus', 'error', '连接失败');
    setResponse('detailResponse', e.message, true);
  });
  var body = $('detailResponse');
  if (body && body.parentElement) body.parentElement.classList.toggle('open');
};

window.testAddMarker = function(btn) {
  var sessionId = ($('markerSessionId') && $('markerSessionId').value) || currentSessionId;
  if (!sessionId) { alert('请先创建课堂'); return; }
  setStatus('markerStatus', 'loading', '添加中...');
  var body = {
    timestampMs: parseInt($('markerTime') ? $('markerTime').value : 15000) || 15000,
    label: ($('markerLabel') && $('markerLabel').value) || 'important',
    note: ($('markerNote') && $('markerNote').value) || null
  };
  api('POST', '/api/sessions/' + sessionId + '/markers', body).then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('markerStatus', 'success', '已标记');
      setResponse('markerResponse', res.data);
      updateFlowStep(2);
    } else {
      setStatus('markerStatus', 'error', '失败');
      setResponse('markerResponse', res.data, true);
    }
  }).catch(function(e) {
    setStatus('markerStatus', 'error', '连接失败');
    setResponse('markerResponse', e.message, true);
  });
};

window.testListMarkers = function(btn) {
  var sessionId = ($('markerListSessionId') && $('markerListSessionId').value) || currentSessionId;
  if (!sessionId) { alert('请先创建课堂'); return; }
  setStatus('markerListStatus', 'loading', '查询中...');
  api('GET', '/api/sessions/' + sessionId + '/markers').then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('markerListStatus', 'success', res.data.data.length + ' 个');
    } else {
      setStatus('markerListStatus', 'error', '失败');
    }
    setResponse('markerListResponse', res.data);
  }).catch(function(e) {
    setStatus('markerListStatus', 'error', '连接失败');
    setResponse('markerListResponse', e.message, true);
  });
  var body = $('markerListResponse');
  if (body && body.parentElement) body.parentElement.classList.toggle('open');
};

window.testEndSession = function(btn) {
  var sessionId = ($('endSessionId') && $('endSessionId').value) || currentSessionId;
  if (!sessionId) { alert('请先创建课堂'); return; }
  setStatus('endStatus', 'loading', '结束中...');
  api('PATCH', '/api/sessions/' + sessionId + '/end').then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('endStatus', 'success', '已结束');
      setResponse('endResponse', res.data);
      updateFlowStep(3);
      setTimeout(function() { window.testGetSummary(); }, 5000);
    } else {
      setStatus('endStatus', 'error', '失败');
      setResponse('endResponse', res.data, true);
    }
  }).catch(function(e) {
    setStatus('endStatus', 'error', '连接失败');
    setResponse('endResponse', e.message, true);
  });
  var body = $('endResponse');
  if (body && body.parentElement) body.parentElement.classList.toggle('open');
};

window.testGetSummary = function(btn) {
  var sessionId = ($('summarySessionId') && $('summarySessionId').value) || currentSessionId;
  if (!sessionId) { alert('请先创建课堂'); return; }
  setStatus('summaryStatus', 'loading', '查询中...');
  api('GET', '/api/sessions/' + sessionId + '/summary').then(function(res) {
    if (res.data && res.data.code === 200) {
      setStatus('summaryStatus', 'success', '已生成');
      setResponse('summaryResponse', res.data.data);
      updateFlowStep(4);
    } else if (res.data && res.data.code === 404) {
      setStatus('summaryStatus', 'loading', '生成中，5秒后重试...');
      setTimeout(function() {
        api('GET', '/api/sessions/' + sessionId + '/summary').then(function(retry) {
          if (retry.data && retry.data.code === 200) {
            setStatus('summaryStatus', 'success', '已生成');
            setResponse('summaryResponse', retry.data.data);
            updateFlowStep(4);
          } else {
            setStatus('summaryStatus', 'error', '尚未生成');
            setResponse('summaryResponse', '总结尚未生成，请稍后重试', true);
          }
        });
      }, 5000);
    } else {
      setStatus('summaryStatus', 'error', '失败');
      setResponse('summaryResponse', res.data, true);
    }
  }).catch(function(e) {
    setStatus('summaryStatus', 'error', '连接失败');
    setResponse('summaryResponse', e.message, true);
  });
  var body = $('summaryResponse');
  if (body && body.parentElement) body.parentElement.classList.toggle('open');
};

// ====== 一键完整流程 ======

window.runFullFlow = function(btn) {
  if (!btn) btn = document.querySelector('.card[style*=\"border:2px solid #2563eb\"] .btn');
  btn.textContent = '执行中...';
  btn.disabled = true;

  var errorOccurred = false;

  var showError = function(msg) {
    console.error(msg);
    errorOccurred = true;
  };

  // 1. 创建课堂
  setStatus('createStatus', 'loading', '创建中...');
  api('POST', '/api/sessions', { title: '物理课-牛顿定律', subject: 'Physics' }).then(function(res1) {
    if (res1.data && res1.data.code === 200 && res1.data.data && res1.data.data.sessionId) {
      setStatus('createStatus', 'success', '已创建');
      setResponse('createResponse', res1.data);
      setSessionId(res1.data.data.sessionId);
      updateFlowStep(1);
    } else {
      setStatus('createStatus', 'error', '失败');
      setResponse('createResponse', res1.data, true);
      showError('步骤1失败');
      finish(btn);
      return;
    }

    // 2. 打标记
    setStatus('markerStatus', 'loading', '添加中...');
    api('POST', '/api/sessions/' + currentSessionId + '/markers', {
      timestampMs: 15000, label: 'important', note: '牛顿第一定律核心概念'
    }).then(function(res2) {
      if (res2.data && res2.data.code === 200) {
        setStatus('markerStatus', 'success', '已标记');
        setResponse('markerResponse', res2.data);
        updateFlowStep(2);
      }

      // 3. 结束课堂（不管标记是否成功）
      setStatus('endStatus', 'loading', '结束中...');
      api('PATCH', '/api/sessions/' + currentSessionId + '/end').then(function(res3) {
        if (res3.data && res3.data.code === 200) {
          setStatus('endStatus', 'success', '已结束');
          setResponse('endResponse', res3.data);
          updateFlowStep(3);
        }

        // 4. 等总结
        setStatus('summaryStatus', 'loading', '等待 AI 总结...');
        var pollCount = 0;
        var pollTimer = setInterval(function() {
          pollCount++;
          if (pollCount > 30) {
            clearInterval(pollTimer);
            setStatus('summaryStatus', 'error', '超时');
            finish(btn);
            return;
          }
          api('GET', '/api/sessions/' + currentSessionId + '/summary').then(function(res4) {
            if (res4.data && res4.data.code === 200) {
              clearInterval(pollTimer);
              setStatus('summaryStatus', 'success', '已生成');
              setResponse('summaryResponse', res4.data.data);
              updateFlowStep(4);
              finish(btn);
            }
          }).catch(function() {});
        }, 1000);

      }).catch(function(e) {
        showError('步骤3失败: ' + e.message);
        finish(btn);
      });
    }).catch(function(e) {
      showError('步骤2失败: ' + e.message);
      finish(btn);
    });
  }).catch(function(e) {
    setStatus('createStatus', 'error', '连接失败');
    setResponse('createResponse', e.message, true);
    showError('步骤1失败: ' + e.message);
    finish(btn);
  });
};

var finish = function(btn) {
  btn.textContent = '完整闭环已完成';
  setTimeout(function() {
    btn.textContent = '一键体验完整闭环';
    btn.disabled = false;
  }, 3000);
};

// ====== WebSocket 音频测试 ======

function generateMockAudio(durationSeconds) {
  var sampleRate = 16000;
  var numSamples = sampleRate * durationSeconds;
  var buffer = new ArrayBuffer(numSamples * 2);
  var view = new DataView(buffer);
  for (var i = 0; i < numSamples; i++) {
    var sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 8000;
    view.setInt16(i * 2, sample, true);
  }
  return new Uint8Array(buffer);
}

window.testWebSocketAudio = function(btn) {
  var sessionId = ($('i-ws-sid') && $('i-ws-sid').value) || currentSessionId;
  if (!sessionId) { alert('请先创建课堂或输入 sessionId'); return; }

  btn.disabled = true;
  btn.textContent = '连接中...';

  var wsUrl = BASE.replace('http', 'ws') + '/ws/session/' + sessionId + '/audio';
  var ws = new WebSocket(wsUrl);
  var logLines = [];
  var logEl = $('r-ws');

  var addLog = function(msg, isError) {
    var time = new Date().toLocaleTimeString();
    logLines.push('[' + time + '] ' + msg);
    if (logEl) {
      logEl.value = logLines.join('\n');
      logEl.className = 'response' + (isError ? ' error' : ' success');
      logEl.scrollTop = logEl.scrollHeight;
    }
  };

  ws.onopen = function() {
    addLog('WebSocket 连接成功 ✅');
    btn.textContent = '发送音频中...';

    var audioData = generateMockAudio(3);
    var frame = new Uint8Array(5 + audioData.length);
    frame[0] = 0x01;
    // 4字节大端时间戳 = 0
    frame[1] = 0; frame[2] = 0; frame[3] = 0; frame[4] = 0;
    frame.set(audioData, 5);

    addLog('发送模拟音频 (440Hz正弦波, 3秒)...');
    ws.send(frame);
    addLog('音频已发送 (约' + Math.round(audioData.length / 1024) + 'KB)');

    setTimeout(function() {
      ws.close();
      btn.textContent = '已断开';
      setTimeout(function() {
        btn.textContent = '测试WebSocket音频';
        btn.disabled = false;
      }, 2000);
    }, 2000);
  };

  ws.onmessage = function(event) {
    try {
      var msg = JSON.parse(event.data);
      if (msg.type === 'transcript') {
        addLog('📝 实时字幕: "' + msg.text + '" (final: ' + msg.isFinal + ')');
      } else if (msg.type === 'error') {
        addLog('⚠️ ' + msg.message, true);
      } else {
        addLog('收到: ' + event.data);
      }
    } catch(e) {
      addLog('收到二进制数据: ' + event.data.byteLength + ' bytes');
    }
  };

  ws.onerror = function() {
    addLog('❌ WebSocket 连接错误', true);
    btn.textContent = '连接失败';
    setTimeout(function() {
      btn.textContent = '测试WebSocket音频';
      btn.disabled = false;
    }, 2000);
  };

  ws.onclose = function(event) {
    addLog('连接关闭 (code: ' + event.code + ')');
  };
};

})();
