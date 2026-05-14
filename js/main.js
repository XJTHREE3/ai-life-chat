const LifeEngine = {
  advanceSchedule() {
    let needRenderMoments = false;
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    characters.forEach((char, idx) => {
      const schedule = char.todaySchedule;
      let targetIdx = -1;
      for (let i = schedule.length - 1; i >= 0; i--) {
        if (schedule[i].time <= currentTime && schedule[i].status !== 'done') {
          targetIdx = i;
          break;
        }
      }
      if (targetIdx < 0) return;
      if (schedule[targetIdx].status === 'current') return;
      for (let i = 0; i < schedule.length; i++) {
        if (i < targetIdx) schedule[i].status = 'done';
        else if (i === targetIdx) schedule[i].status = 'current';
        else schedule[i].status = 'pending';
      }
      const nextEvent = schedule[targetIdx];
      this.updateStatus(nextEvent, idx);
      this.updateLocation(nextEvent.location, idx);
      this.updateWallet(nextEvent.cost, idx);
      updateMood(nextEvent, idx);
      const today = new Date().toISOString().split('T')[0];
      if (char.lastPostDate !== today) {
        char.hasPostedToday = false;
      }
      if (!char.hasPostedToday && Math.random() < 0.3) {
        char.hasPostedToday = true;
        char.lastPostDate = today;
        const moment = generateCharMoment(idx);
        if (moment) {
          moments.unshift(moment);
          needRenderMoments = true;
        }
      }
    });
    if (needRenderMoments) {
      renderMoments();
    }
    saveToLocalStorage();
  },

  updateStatus(event, charIndex) {
    const char = characters[charIndex !== undefined ? charIndex : currentCharIndex];
    const eventLower = event.event.toLowerCase();
    if (eventLower.includes('睡觉')) {
      char.status = 'offline';
    } else if (eventLower.includes('工作') || eventLower.includes('电影') || eventLower.includes('游戏') || eventLower.includes('上课') || eventLower.includes('看书') || eventLower.includes('追剧')) {
      char.status = 'occupied';
    } else {
      char.status = 'online';
    }
  },

  updateLocation(location, charIndex) {
    characters[charIndex !== undefined ? charIndex : currentCharIndex].location = location;
  },

  updateWallet(amount, charIndex) {
    characters[charIndex !== undefined ? charIndex : currentCharIndex].wallet += amount;
  },

  getCurrentEvent() {
    return characters[currentCharIndex].todaySchedule.find(s => s.status === 'current');
  },

  poke() {
    const event = this.getCurrentEvent();
    if (!event) return { success: false, message: '对方现在没事' };

    if (Math.random() < 0.7) {
      characters[currentCharIndex].status = 'online';
      return {
        success: true,
        event: event,
        message: this.getPokeResponse(event)
      };
    } else {
      return { success: false, message: '戳了戳对方，但没有反应...' };
    }
  },

  getPokeResponse(event) {
    const responses = {
      '睡觉': [
        '唔...谁啊...让我再睡会儿...',
        '嗯？几点了...我还在做梦呢...',
        '啊...被吵醒了...什么事这么急...'
      ],
      '工作': [
        '哎呀，思路被打断了...什么事？',
        '嗯？我正在写代码呢，说吧',
        '稍等，我保存一下...好了，什么事？'
      ],
      '电影': [
        '嘘！正到精彩部分呢...什么事？',
        '啊，错过了...算了，说吧什么事',
        '等我一下，这幕马上结束...'
      ],
      '打游戏': [
        '别别别！正在团战呢！',
        '啊！死了死了...什么事？',
        '等我打完这局...好了，说吧'
      ],
      '上课': [
        '嘘...老师在看这边...下课再说',
        '偷偷回你一下，上课中...',
        '不敢玩手机...下课聊'
      ],
      '看书': [
        '嗯？我正看书呢，什么事？',
        '在图书馆，小声点~',
        '等我把这页看完...好了，说吧'
      ],
      '追剧': [
        '嘘！正精彩呢！',
        '等我看完这集！',
        '追剧中，别打扰~'
      ],
      'default': [
        '嗯？找我什么事？',
        '怎么啦？',
        '在呢，说吧'
      ]
    };

    const category = Object.keys(responses).find(k => event.event.includes(k)) || 'default';
    const options = responses[category];
    return options[Math.floor(Math.random() * options.length)];
  }
};

function showPage(pageId) {
  closeFuncPanel();
  const currentPage = document.querySelector('.page.active');
  const targetPage = document.getElementById(pageId);

  if (currentPage === targetPage) return;

  currentPage.classList.remove('active');
  currentPage.classList.add('exiting');

  setTimeout(() => {
    currentPage.classList.remove('exiting');
    targetPage.classList.add('active');
  }, 50);

  const tabBar = document.getElementById('tab-bar');
  const tabPages = ['chat-list-page', 'friends-page', 'profile-page'];
  if (tabPages.includes(pageId)) {
    tabBar.style.display = 'flex';
  } else {
    tabBar.style.display = 'none';
  }

  if (pageId === 'friends-page') {
    renderMoments();
  }
  if (pageId === 'memo-page') {
    renderMemo();
  }
  if (pageId === 'preset-page') {
    renderPresetPage();
  }
  if (pageId === 'settings-page') {
    loadApiConfigToUI();
  }
  if (pageId === 'worldbook-page') {
    renderWorldBookPage();
  }
  if (pageId === 'profile-page') {
    document.getElementById('user-persona-desc').textContent = userState.personaDescription || '暂无，此描述将注入到AI上下文中作为你的角色设定...';
  }
}

function goHome() {
  const tabBar = document.getElementById('tab-bar');
  tabBar.style.display = 'none';
  showPage('desktop-page');
}

function openWechat() {
  const tabBar = document.getElementById('tab-bar');
  tabBar.style.display = 'flex';
  showPage('chat-list-page');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const pageMap = {
    'chat': 'chat-list-page',
    'friends': 'friends-page',
    'profile': 'profile-page'
  };
  showPage(pageMap[tab]);
}

function openChat(charIndex) {
  currentCharIndex = charIndex !== undefined ? charIndex : 0;
  const char = characters[currentCharIndex];
  document.getElementById('detail-name').textContent = char.name || char.nickname || '';

  if (chatHistories[currentCharIndex].length === 0 && char.first_mes) {
    chatHistories[currentCharIndex].push({
      role: 'char',
      content: char.first_mes,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      read: true
    });
    saveToLocalStorage();
  }

  showPage('chat-detail-page');
  updateStatusDisplay();
  renderMessages();
  setTimeout(() => {
    const container = document.getElementById('messages');
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function openCharInfo(charIndex) {
  if (charIndex !== undefined) currentCharIndex = charIndex;
  const char = characters[currentCharIndex];
  const avatarEl = document.getElementById('char-info-avatar');
  if (char.avatarImage) {
    avatarEl.innerHTML = `<img src="${char.avatarImage}" alt="">`;
    avatarEl.style.background = '';
  } else {
    avatarEl.innerHTML = `${char.avatar || (char.name ? char.name.charAt(0) : '?')}`;
    avatarEl.style.background = getMorandiColor(char.name);
  }
  document.getElementById('char-info-name').textContent = char.name || '未设置';
  document.getElementById('char-info-description').textContent = truncateText(char.description, 40) || '点击设置';
  document.getElementById('char-info-personality').textContent = truncateText(char.personality, 30) || '点击设置';
  document.getElementById('char-info-scenario').textContent = truncateText(char.scenario, 30) || '点击设置';
  document.getElementById('char-info-first-mes').textContent = truncateText(char.first_mes, 30) || '点击设置';
  document.getElementById('char-info-mes-example').textContent = truncateText(char.mes_example, 30) || '点击设置';
  document.getElementById('char-info-system-prompt').textContent = truncateText(char.system_prompt, 30) || '点击设置';

  const cbContainer = document.getElementById('char-book-entries');
  if (cbContainer) {
    cbContainer.innerHTML = renderCharBookEntries(currentCharIndex);
  }
  showPage('char-info-page');
}

function truncateText(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function editCharField(field) {
  const char = characters[currentCharIndex];
  currentEditType = 'char-' + field;
  const fieldMap = {
    'char-name': { title: '编辑名字', value: char.name || '', placeholder: '输入角色名字...' },
    'char-description': { title: '编辑角色描述', value: char.description || '', placeholder: '描述角色的外貌、背景、性格等...' },
    'char-personality': { title: '编辑人格', value: char.personality || '', placeholder: '描述角色的人格特征...' },
    'char-scenario': { title: '编辑情景', value: char.scenario || '', placeholder: '描述角色所处的情景...' },
    'char-first_mes': { title: '编辑开场白', value: char.first_mes || '', placeholder: '角色的第一条消息...' },
    'char-mes_example': { title: '编辑对话示例', value: char.mes_example || '', placeholder: '对话示例...' },
    'char-system_prompt': { title: '编辑系统提示词', value: char.system_prompt || '', placeholder: '角色专属系统提示词...' }
  };
  const config = fieldMap[currentEditType];
  if (!config) return;
  document.getElementById('edit-modal-title').textContent = config.title;
  document.getElementById('edit-textarea').value = config.value;
  document.getElementById('edit-textarea').placeholder = config.placeholder;
  document.getElementById('edit-modal').classList.add('active');
}

function handleCharAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxSize = 200;
      let w = img.width;
      let h = img.height;
      if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
      else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      characters[currentCharIndex].avatarImage = canvas.toDataURL('image/jpeg', 0.8);
      const avatarEl = document.getElementById('char-info-avatar');
      avatarEl.innerHTML = `<img src="${characters[currentCharIndex].avatarImage}" alt="">`;
      avatarEl.style.background = '';
      saveToLocalStorage();
      renderChatList();
    };
    img.onerror = function() {
      characters[currentCharIndex].avatarImage = e.target.result;
      const avatarEl = document.getElementById('char-info-avatar');
      avatarEl.innerHTML = `<img src="${characters[currentCharIndex].avatarImage}" alt="">`;
      avatarEl.style.background = '';
      saveToLocalStorage();
      renderChatList();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function handleUserAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    userState.avatarImage = e.target.result;
    renderUserAvatar();
    saveToLocalStorage();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function renderUserAvatar() {
  const avatarEl = document.getElementById('user-avatar-display');
  if (userState.avatarImage) {
    avatarEl.innerHTML = `<img src="${userState.avatarImage}" alt="">`;
  } else {
    avatarEl.textContent = userState.name ? userState.name.charAt(0) : '我';
  }
}

function editSignature() {
  currentEditType = 'signature';
  document.getElementById('edit-modal-title').textContent = '编辑签名';
  document.getElementById('edit-textarea').value = userState.signature;
  document.getElementById('edit-textarea').placeholder = '写一句话介绍自己...';
  document.getElementById('edit-modal').classList.add('active');
}

function editUserName() {
  currentEditType = 'username';
  document.getElementById('edit-modal-title').textContent = '修改名字';
  document.getElementById('edit-textarea').value = userState.name;
  document.getElementById('edit-textarea').placeholder = '输入你的名字...';
  document.getElementById('edit-modal').classList.add('active');
}

function editWallet() {
  currentEditType = 'wallet';
  document.getElementById('edit-modal-title').textContent = '修改钱包';
  document.getElementById('edit-textarea').value = userState.wallet.toFixed(2);
  document.getElementById('edit-textarea').placeholder = '输入金额...';
  document.getElementById('edit-modal').classList.add('active');
}

function editUserDesc() {
  currentEditType = 'desc';
  document.getElementById('edit-modal-title').textContent = '编辑个人设定';
  document.getElementById('edit-textarea').value = userState.desc;
  document.getElementById('edit-textarea').placeholder = '描述你的性格、喜好、背景等...';
  document.getElementById('edit-modal').classList.add('active');
}

function editPersonaDesc() {
  currentEditType = 'persona';
  document.getElementById('edit-modal-title').textContent = '编辑AI人设描述';
  document.getElementById('edit-textarea').value = userState.personaDescription || '';
  document.getElementById('edit-textarea').placeholder = '此描述将注入到AI上下文中，作为{{user}}的角色设定...';
  document.getElementById('edit-modal').classList.add('active');
}

function editRealName() {
  currentEditType = 'realname';
  document.getElementById('edit-modal-title').textContent = '修改真实姓名';
  document.getElementById('edit-textarea').value = userState.realName || '';
  document.getElementById('edit-textarea').placeholder = '输入真实姓名（可选，AI会用这个名字称呼你）';
  document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal(e) {
  if (e && e.target.id !== 'edit-modal') return;
  document.getElementById('edit-modal').classList.remove('active');
}

function confirmEdit() {
  const value = document.getElementById('edit-textarea').value.trim();

  if (currentEditType === 'signature') {
    userState.signature = value;
    document.getElementById('user-signature').textContent = value || '点击设置签名';
  } else if (currentEditType === 'username') {
    userState.name = value || '用户';
    document.getElementById('user-name').textContent = userState.name;
  } else if (currentEditType === 'wallet') {
    const num = parseFloat(value);
    userState.wallet = isNaN(num) ? 0 : num;
    document.getElementById('user-wallet').textContent = '¥' + userState.wallet.toFixed(2);
  } else if (currentEditType === 'desc') {
    userState.desc = value;
    document.getElementById('user-desc').textContent = value || '暂无描述，点击编辑添加个人设定...';
  } else if (currentEditType === 'persona') {
    userState.personaDescription = value;
    document.getElementById('user-persona-desc').textContent = value || '暂无，此描述将注入到AI上下文中作为你的角色设定...';
  } else if (currentEditType === 'realname') {
    userState.realName = value;
    document.getElementById('user-realname').textContent = value || '未设置';
  } else if (currentEditType === 'new-worldbook') {
    if (value) {
      createWorldBook(value);
      currentWorldBookIndex = worldBooks.length - 1;
      if (typeof renderWorldBookPage === 'function') renderWorldBookPage();
      saveToLocalStorage();
    }
  } else if (currentEditType.startsWith('char-')) {
    const field = currentEditType.replace('char-', '');
    characters[currentCharIndex][field] = value;
    openCharInfo(currentCharIndex);
    renderChatList();
  }

  closeEditModal();
  saveToLocalStorage();
}

function showNewCharModal() {
  document.getElementById('new-char-name').value = '';
  document.getElementById('new-char-desc').value = '';
  document.getElementById('new-char-first-mes').value = '';
  document.getElementById('new-char-modal').classList.add('active');
}

function closeNewCharModal() {
  document.getElementById('new-char-modal').classList.remove('active');
}

function confirmNewChar() {
  const name = document.getElementById('new-char-name').value.trim();
  if (!name) {
    alert('请输入角色名字');
    return;
  }
  const desc = document.getElementById('new-char-desc').value.trim();
  const firstMes = document.getElementById('new-char-first-mes').value.trim();
  const charData = createDefaultCharacter(name);
  charData.description = desc;
  charData.first_mes = firstMes;
  addCharacter(charData);
  closeNewCharModal();
  renderChatList();
}

function deleteCurrentChar() {
  if (characters.length <= 1) {
    alert('至少保留一个角色');
    return;
  }
  showConfirmModal(
    '删除角色',
    '确定删除角色"' + (characters[currentCharIndex].name || '') + '"？此操作不可撤销。',
    function() {
      deleteCharacter(currentCharIndex);
      showPage('chat-list-page');
      renderChatList();
    }
  );
}

function confirmDeleteChar() {
  if (characters.length <= 1) {
    alert('至少保留一个角色');
    return;
  }
  showConfirmModal(
    '删除角色',
    '确定删除角色"' + (characters[currentCharIndex].name || '') + '"？此操作不可撤销。',
    function() {
      deleteCharacter(currentCharIndex);
      showPage('chat-list-page');
      renderChatList();
    }
  );
}

function confirmClearMessages() {
  const char = characters[currentCharIndex];
  showConfirmModal(
    '清空消息',
    '确定清空与"' + (char.name || '') + '"的所有聊天记录？此操作不可撤销。',
    function() {
      chatHistories[currentCharIndex] = [];
      if (char.first_mes) {
        chatHistories[currentCharIndex].push({
          role: 'char',
          content: char.first_mes,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          read: true
        });
      }
      saveToLocalStorage();
      renderChatList();
    }
  );
}

let confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-msg').textContent = message;
  confirmCallback = onConfirm;
  document.getElementById('confirm-modal').classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('active');
  confirmCallback = null;
}

function executeConfirm() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirmModal();
}

document.getElementById('message-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('message-input').addEventListener('focus', () => {
  closeFuncPanel();
});

setInterval(() => {
  LifeEngine.advanceSchedule();
  updateStatusDisplay();
  renderChatList();
  renderSchedule();
}, 60000);

loadFromLocalStorage();
LifeEngine.advanceSchedule();

document.getElementById('user-signature').textContent = userState.signature || '点击设置签名';
const userDescEl = document.getElementById('user-desc');
if (userDescEl) userDescEl.textContent = userState.desc || '暂无描述，点击编辑添加个人设定...';
const personaDescEl = document.getElementById('user-persona-desc');
if (personaDescEl) personaDescEl.textContent = userState.personaDescription || '暂无，此描述将注入到AI上下文中作为你的角色设定...';
document.getElementById('user-name').textContent = userState.name;
const realNameEl = document.getElementById('user-realname');
if (realNameEl) realNameEl.textContent = userState.realName || '未设置';
document.getElementById('user-wallet').textContent = '¥' + userState.wallet.toFixed(2);
document.getElementById('detail-name').textContent = characters[currentCharIndex].name || characters[currentCharIndex].nickname || '';

renderUserAvatar();
renderChatList();
renderSchedule();
renderMoments();
renderMemo();

EventBus.on('chat:message-sent', async function(data) {
  if (lifeAgentMode === 'realtime' && lifeAgentConfig.url && lifeAgentConfig.apiKey) {
    try {
      await LifeAgent.process(data.charIndex, 'realtime');
      renderMessages();
      renderChatList();
      renderSchedule();
      renderMemo();
    } catch(e) {
      console.error('LifeAgent realtime error:', e);
    }
  }
});

EventBus.on('life:message-sent', function(data) {
  if (data.charIndex === currentCharIndex) {
    renderMessages();
  }
  renderChatList();
});

EventBus.on('life:moment-posted', function() {
  renderMoments();
});

EventBus.on('life:status-updated', function(data) {
  if (data.charIndex === currentCharIndex) {
    updateStatusDisplay();
  }
  renderChatList();
  renderSchedule();
  renderMemo();
});

let lifeAgentTimer = null;

function startLifeAgentTimer() {
  stopLifeAgentTimer();
  lifeAgentTimer = setInterval(async function() {
    if (lifeAgentMode !== 'timed' || !lifeAgentConfig.url || !lifeAgentConfig.apiKey) return;
    for (let i = 0; i < characters.length; i++) {
      try {
        await LifeAgent.process(i, 'timed');
      } catch(e) {
        console.error('LifeAgent timed error:', e);
      }
    }
    renderMessages();
    renderChatList();
    renderSchedule();
    renderMemo();
    renderMoments();
  }, 30 * 60 * 1000);
}

function stopLifeAgentTimer() {
  if (lifeAgentTimer) {
    clearInterval(lifeAgentTimer);
    lifeAgentTimer = null;
  }
}

async function triggerLifeAgentManual() {
  if (!lifeAgentConfig.url || !lifeAgentConfig.apiKey) {
    alert('请先配置LifeAgent API');
    return;
  }
  for (let i = 0; i < characters.length; i++) {
    try {
      await LifeAgent.process(i, 'manual');
    } catch(e) {
      console.error('LifeAgent manual error:', e);
    }
  }
  renderMessages();
  renderChatList();
  renderSchedule();
  renderMemo();
  renderMoments();
}

function switchLifeAgentMode(mode) {
  lifeAgentMode = mode;
  saveToLocalStorage();
  if (mode === 'timed') {
    startLifeAgentTimer();
  } else {
    stopLifeAgentTimer();
  }
  const modeLabel = { realtime: '实时', timed: '定时', manual: '手动' }[mode] || mode;
  const indicator = document.getElementById('agent-mode-indicator');
  if (indicator) indicator.textContent = modeLabel;
}

async function testLifeAgentConnection() {
  const resultEl = document.getElementById('agent-test-result');
  const url = document.getElementById('life-agent-url').value.trim();
  const apiKey = document.getElementById('life-agent-key').value.trim();
  const model = document.getElementById('life-agent-model').value.trim() || 'qwen-turbo';
  if (!url || !apiKey) {
    resultEl.textContent = '请先填写API端点和Key';
    resultEl.className = 'agent-test-result error';
    return;
  }
  resultEl.textContent = '测试中...';
  resultEl.className = 'agent-test-result';
  resultEl.style.display = 'block';
  try {
    const baseUrl = url.replace(/\/+$/, '');
    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5
      })
    });
    if (response.ok) {
      resultEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>连接成功！API可用';
      resultEl.className = 'agent-test-result success';
    } else {
      const err = await response.json().catch(() => ({}));
      resultEl.textContent = '连接失败：' + (err.error?.message || response.status);
      resultEl.className = 'agent-test-result error';
    }
  } catch (e) {
    resultEl.textContent = '连接失败：' + e.message;
    resultEl.className = 'agent-test-result error';
  }
}

let expandedAgentPromptIndex = -1;

function renderAgentPromptList() {
  const container = document.getElementById('agent-prompt-list');
  if (!lifeAgentPrompts || lifeAgentPrompts.length === 0) {
    container.innerHTML = '<div class="prompt-empty">暂无提示词，点击右上角 + 添加</div>';
    return;
  }
  const sorted = lifeAgentPrompts
    .map((p, i) => ({ ...p, _origIndex: i }))
    .sort((a, b) => a.injection_order - b.injection_order);

  container.innerHTML = sorted.map((prompt) => {
    const idx = prompt._origIndex;
    const isExpanded = expandedAgentPromptIndex === idx;
    const isMarker = prompt.marker === true;
    const roleLabel = { system: 'System', user: 'User', assistant: 'Assistant' }[prompt.role || 'system'] || prompt.role;

    return `
      <div class="agent-prompt-item ${isExpanded ? 'expanded' : ''} ${!prompt.enabled ? 'disabled' : ''}" data-index="${idx}">
        <div class="agent-prompt-header" onclick="toggleAgentPromptExpand(${idx})">
          <span class="agent-prompt-name">${isMarker ? '🔨 ' : ''}${escapeHtml(prompt.name || '未命名')}</span>
          <span class="agent-prompt-role">${roleLabel}</span>
          ${isMarker ? '<span class="prompt-marker-tag">标记</span>' : ''}
          <label class="wb-switch prompt-switch" onclick="event.stopPropagation()">
            <input type="checkbox" ${prompt.enabled ? 'checked' : ''} onchange="toggleAgentPromptEnabled(${idx}, this.checked)">
            <span class="wb-switch-slider"></span>
          </label>
        </div>
        ${isExpanded ? `
        <div class="agent-prompt-body">
          <div class="agent-prompt-field">
            <label>名称</label>
            <input type="text" value="${escapeAttr(prompt.name)}" oninput="updateAgentPromptField(${idx}, 'name', this.value)">
          </div>
          <div class="agent-prompt-field">
            <label>角色</label>
            <select onchange="updateAgentPromptField(${idx}, 'role', this.value)">
              <option value="system" ${prompt.role === 'system' ? 'selected' : ''}>System</option>
              <option value="user" ${prompt.role === 'user' ? 'selected' : ''}>User</option>
              <option value="assistant" ${prompt.role === 'assistant' ? 'selected' : ''}>Assistant</option>
            </select>
          </div>
          <div class="agent-prompt-field">
            <label>排序权重</label>
            <input type="number" value="${prompt.injection_order}" oninput="updateAgentPromptField(${idx}, 'injection_order', parseInt(this.value)||0)">
          </div>
          <div class="agent-prompt-field">
            <label>内容 <span class="prompt-marker-hint" title="可用变量：{{name}} {{mood}} {{moodDesc}} {{innerThought}} {{wallet}} {{schedule}} {{recentChat}} {{existingMemories}} {{mode}}">[变量]</span></label>
            <textarea rows="4" oninput="updateAgentPromptField(${idx}, 'content', this.value)">${escapeHtml(prompt.content)}</textarea>
          </div>
          <div class="agent-prompt-field prompt-marker-field">
            <label>标记 <span class="prompt-marker-hint" title="标记条目由系统自动填充内容，通常不需要手动编辑">[?]</span></label>
            <label class="wb-switch prompt-switch">
              <input type="checkbox" ${prompt.marker ? 'checked' : ''} onchange="updateAgentPromptField(${idx}, 'marker', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
          <div class="agent-prompt-actions">
            <button class="agent-prompt-action" onclick="moveAgentPromptUp(${idx})">↑</button>
            <button class="agent-prompt-action" onclick="moveAgentPromptDown(${idx})">↓</button>
            <button class="agent-prompt-action delete" onclick="deleteAgentPrompt(${idx})">删除</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toggleAgentPromptExpand(index) {
  expandedAgentPromptIndex = expandedAgentPromptIndex === index ? -1 : index;
  renderAgentPromptList();
}

function toggleAgentPromptEnabled(index, checked) {
  lifeAgentPrompts[index].enabled = checked;
  saveToLocalStorage();
  renderAgentPromptList();
}

function updateAgentPromptField(index, field, value) {
  lifeAgentPrompts[index][field] = value;
  saveToLocalStorage();
}

function addAgentPrompt() {
  const maxOrder = lifeAgentPrompts.reduce((max, p) => Math.max(max, p.injection_order || 0), 0);
  lifeAgentPrompts.push({
    identifier: 'agent-custom-' + Date.now(),
    name: '新提示词',
    role: 'system',
    content: '',
    enabled: true,
    injection_order: maxOrder + 50,
    marker: false
  });
  expandedAgentPromptIndex = lifeAgentPrompts.length - 1;
  saveToLocalStorage();
  renderAgentPromptList();
}

function deleteAgentPrompt(index) {
  lifeAgentPrompts.splice(index, 1);
  expandedAgentPromptIndex = -1;
  saveToLocalStorage();
  renderAgentPromptList();
}

function moveAgentPromptUp(index) {
  if (!lifeAgentPrompts || lifeAgentPrompts.length <= 1) return;
  const sorted = lifeAgentPrompts.map((p, i) => ({ ...p, _origIndex: i })).sort((a, b) => a.injection_order - b.injection_order);
  const sortedPos = sorted.findIndex(s => s._origIndex === index);
  if (sortedPos <= 0) return;
  const prevOrigIndex = sorted[sortedPos - 1]._origIndex;
  const tmpOrder = lifeAgentPrompts[index].injection_order;
  lifeAgentPrompts[index].injection_order = lifeAgentPrompts[prevOrigIndex].injection_order;
  lifeAgentPrompts[prevOrigIndex].injection_order = tmpOrder;
  saveToLocalStorage();
  renderAgentPromptList();
}

function moveAgentPromptDown(index) {
  if (!lifeAgentPrompts || lifeAgentPrompts.length <= 1) return;
  const sorted = lifeAgentPrompts.map((p, i) => ({ ...p, _origIndex: i })).sort((a, b) => a.injection_order - b.injection_order);
  const sortedPos = sorted.findIndex(s => s._origIndex === index);
  if (sortedPos >= sorted.length - 1) return;
  const nextOrigIndex = sorted[sortedPos + 1]._origIndex;
  const tmpOrder = lifeAgentPrompts[index].injection_order;
  lifeAgentPrompts[index].injection_order = lifeAgentPrompts[nextOrigIndex].injection_order;
  lifeAgentPrompts[nextOrigIndex].injection_order = tmpOrder;
  saveToLocalStorage();
  renderAgentPromptList();
}

function saveLifeAgentConfig() {
  lifeAgentConfig.url = document.getElementById('life-agent-url').value.trim();
  lifeAgentConfig.apiKey = document.getElementById('life-agent-key').value.trim();
  lifeAgentConfig.model = document.getElementById('life-agent-model').value.trim() || 'qwen-turbo';
  saveToLocalStorage();
}

function loadLifeAgentConfigToUI() {
  const urlEl = document.getElementById('life-agent-url');
  const keyEl = document.getElementById('life-agent-key');
  const modelEl = document.getElementById('life-agent-model');
  if (urlEl) urlEl.value = lifeAgentConfig.url || '';
  if (keyEl) keyEl.value = lifeAgentConfig.apiKey || '';
  if (modelEl) modelEl.value = lifeAgentConfig.model || '';
  const indicator = document.getElementById('agent-mode-indicator');
  if (indicator) indicator.textContent = { realtime: '实时', timed: '定时', manual: '手动' }[lifeAgentMode] || '实时';
}

if (lifeAgentMode === 'timed') {
  startLifeAgentTimer();
}

function openAgentPanel() {
  loadLifeAgentConfigToUI();
  updateAgentModeBtns();
  renderAgentPromptList();
  showPage('agent-page');
}

function closeAgentPanel() {
  showPage('desktop-page');
}

function updateAgentModeBtns() {
  document.querySelectorAll('.agent-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === lifeAgentMode);
  });
  const descEl = document.getElementById('agent-mode-desc');
  if (descEl) {
    const descs = {
      realtime: '每次对话后自动提取记忆和更新状态',
      timed: '每30分钟自动更新状态、发朋友圈、主动发消息',
      manual: '手动点击按钮触发全面更新'
    };
    descEl.textContent = descs[lifeAgentMode] || '';
  }
}
