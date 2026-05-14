function resolveMarker(identifier, char, vars, beforeEntries, afterEntries, preset, chatHistory) {
  const wiFormat = preset.wiFormat || '{0}';
  const scenarioFormat = preset.scenarioFormat || '[Circumstances: {{scenario}}]';
  const personalityFormat = preset.personalityFormat || "[{{char}}'s personality: {{personality}}]";

  switch (identifier) {
    case 'worldInfoBefore': {
      if (beforeEntries.length === 0) return '';
      return beforeEntries
        .sort((a, b) => (a.insertion_order || 100) - (b.insertion_order || 100))
        .map(e => formatWorldBookEntry(substituteVars(e.content, vars), wiFormat))
        .join('\n');
    }
    case 'charDescription': {
      const desc = char.description || '';
      return desc ? substituteVars(desc, vars) : '';
    }
    case 'charPersonality': {
      const p = char.personality || '';
      if (!p) return '';
      let formatted = personalityFormat
        .replace(/\{\{char\}\}/g, vars.char)
        .replace(/\{\{personality\}\}/g, p);
      return substituteVars(formatted, vars);
    }
    case 'scenario': {
      const s = char.scenario || '';
      if (!s) return '';
      let formatted = scenarioFormat
        .replace(/\{\{scenario\}\}/g, s);
      return substituteVars(formatted, vars);
    }
    case 'personaDescription': {
      const pd = userState.personaDescription || '';
      return pd ? substituteVars(pd, vars) : '';
    }
    case 'worldInfoAfter': {
      if (afterEntries.length === 0) return '';
      return afterEntries
        .sort((a, b) => (a.insertion_order || 100) - (b.insertion_order || 100))
        .map(e => formatWorldBookEntry(substituteVars(e.content, vars), wiFormat))
        .join('\n');
    }
    case 'chatHistory': {
      return '';
    }
    case 'dialogueExamples': {
      const ex = char.mes_example || '';
      return ex ? substituteVars(ex, vars) : '';
    }
    default:
      return '';
  }
}

const ChatEngine = {
  async processMessage(userMessage) {
    const char = characters[currentCharIndex];
    const status = char.status;
    const event = LifeEngine.getCurrentEvent();

    if (status === 'offline') {
      return this.offlineResponse(event);
    }

    if (apiConfig.url && apiConfig.apiKey) {
      try {
        return await this.callApi(userMessage, char, event);
      } catch (e) {
        console.error('API调用失败，回退到模拟回复:', e.message);
      }
    }

    if (status === 'occupied') {
      return this.occupiedResponse(userMessage, event);
    }
    return this.onlineResponse(userMessage);
  },

  async callApi(userMessage, char, event) {
    const preset = presets[currentPresetIndex];
    const messages = [];

    const vars = {
      char: char.name || char.nickname || '',
      user: userState.name || '我',
      userRealName: userState.realName || '',
      mood: char.mood,
      location: event ? event.location : ''
    };

    const charBook = char.character_book;
    const wbEntries = (preset.worldBookEnabled !== false && charBook && charBook.entries)
      ? matchWorldBookEntries(chatHistories[currentCharIndex], charBook.entries)
      : [];
    const beforeEntries = wbEntries.filter(e => e.constant || e.position === 'before_char');
    const afterEntries = wbEntries.filter(e => !e.constant && e.position !== 'before_char');

    if (preset.prompts && preset.prompts.length > 0) {
      const enabledPrompts = preset.prompts
        .filter(p => p.enabled)
        .sort((a, b) => a.injection_order - b.injection_order);

      for (const prompt of enabledPrompts) {
        if (prompt.marker) {
          const markerContent = resolveMarker(prompt.identifier, char, vars, beforeEntries, afterEntries, preset, chatHistories[currentCharIndex]);
          if (markerContent) {
            messages.push({ role: prompt.role || 'system', content: markerContent });
          }
        } else {
          const content = substituteVars(prompt.content || '', vars);
          if (content) {
            messages.push({ role: prompt.role || 'system', content: content });
          }
        }
      }
    } else if (preset.systemPrompt) {
      messages.push({ role: 'system', content: substituteVars(preset.systemPrompt, vars) });
    }

    let charContent = '你现在的角色设定：';
    charContent += '\n名字：' + (char.name || char.nickname || '');
    if (char.nickname && char.name && char.nickname !== char.name) {
      charContent += '（微信昵称：' + char.nickname + '，注意昵称不是真名）';
    }
    if (userState.realName) {
      charContent += '\n用户的真实姓名：' + userState.realName + '（微信昵称是' + (userState.name || '我') + '，昵称不是真名）';
    } else {
      charContent += '\n用户微信昵称：' + (userState.name || '我') + '（这是昵称，不是真名）';
    }
    charContent += '\n当前心情：' + char.mood + '（' + char.moodDesc + '）';
    charContent += '\n内心想法：' + char.innerThought;
    if (event) {
      charContent += '\n当前日程：' + event.event + '（' + event.location + '）';
      charContent += '\n日程描述：' + event.desc;
    }
    charContent += '\n钱包余额：¥' + char.wallet.toFixed(2);
    charContent += '\n\n请严格保持角色设定，用' + (char.name || char.nickname || '') + '的口吻回复。';
    charContent += '\n\n【消息格式规则 - 必须严格遵守】';
    charContent += '\n你要发多条消息时，必须用 ||| 分隔，每段会变成一个独立气泡。';
    charContent += '\n特殊标签必须单独占一段，绝不能和普通文字粘在一起。';
    charContent += '\n\n可用标签：';
    charContent += '\n[照片:描述] [视频:描述] [转账:金额|备注] [位置:地点|地址] [文件:文件名|大小] [礼物:内容|金额] [红包:金额|祝福语]';
    charContent += '\n[收款:金额] [退还转账:金额] [领红包:金额] [退回红包:金额] [收礼物:内容] [退回礼物:内容]';
    charContent += '\n\n✅ 正确写法：';
    charContent += '\n好呀|||那我们走吧';
    charContent += '\n给你发个红包|||[红包:8.88|生日快乐]|||生日快乐！';
    charContent += '\n谢谢你！|||[收款:50]';
    charContent += '\n\n❌ 错误写法：';
    charContent += '\n好呀，我转给你[转账:50|请收]收到了吗  ← 标签和文字粘在一起';
    charContent += '\n给你发个红包[红包:8.88|生日快乐]  ← 缺少|||分隔';
    charContent += '\n\n回复简短自然，像微信聊天。不要使用markdown格式。不要输出时间戳。不要解释格式用法。';
    messages.push({ role: 'system', content: charContent });

    const history = chatHistories[currentCharIndex];
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        let content = msg.content;
        if (msg.type === 'photo') content = '[照片:' + (msg.extra?.imageDesc || msg.content) + ']';
        else if (msg.type === 'video') content = '[视频:' + (msg.extra?.videoDesc || msg.content) + ']';
        else if (msg.type === 'transfer') content = '[转账:' + (msg.extra?.amount || 0).toFixed(2) + '|' + (msg.extra?.note || '请收款') + ']';
        else if (msg.type === 'location') content = '[位置:' + (msg.extra?.place || msg.content) + '|' + (msg.extra?.address || '') + ']';
        else if (msg.type === 'file') content = '[文件:' + (msg.extra?.fileName || msg.content) + '|' + (msg.extra?.fileSize || '') + ']';
        else if (msg.type === 'gift') content = '[礼物:' + (msg.extra?.giftContent || msg.content) + '|' + (msg.extra?.amount || 0).toFixed(2) + ']';
        else if (msg.type === 'redpacket') content = '[红包:' + (msg.extra?.amount || 0).toFixed(2) + '|' + (msg.extra?.blessing || '恭喜发财') + ']';
        messages.push({ role: 'user', content: content });
      } else if (msg.role === 'char' && msg.content) {
        let content = msg.content;
        if (msg.type === 'photo') content = '[照片:' + (msg.extra?.imageDesc || msg.content) + ']';
        else if (msg.type === 'video') content = '[视频:' + (msg.extra?.videoDesc || msg.content) + ']';
        else if (msg.type === 'transfer') content = '[转账:' + (msg.extra?.amount || 0).toFixed(2) + '|' + (msg.extra?.note || '请收款') + ']';
        else if (msg.type === 'location') content = '[位置:' + (msg.extra?.place || msg.content) + '|' + (msg.extra?.address || '') + ']';
        else if (msg.type === 'file') content = '[文件:' + (msg.extra?.fileName || msg.content) + '|' + (msg.extra?.fileSize || '') + ']';
        else if (msg.type === 'gift') content = '[礼物:' + (msg.extra?.giftContent || msg.content) + '|' + (msg.extra?.amount || 0).toFixed(2) + ']';
        else if (msg.type === 'redpacket') content = '[红包:' + (msg.extra?.amount || 0).toFixed(2) + '|' + (msg.extra?.blessing || '恭喜发财') + ']';
        messages.push({ role: 'assistant', content: content });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(apiConfig.url + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiConfig.apiKey
      },
      body: JSON.stringify({
        model: apiConfig.model || 'qwen-plus',
        messages: messages,
        temperature: preset.parameters.temperature,
        max_tokens: preset.parameters.maxTokens,
        top_p: preset.parameters.topP
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || response.status + ' ' + response.statusText);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('API返回空内容');
    }

    return {
      content: content,
      read: true,
      showSystem: false
    };
  },

  onlineResponse(message) {
    const rand = Math.random();
    if (rand < 0.08) {
      const char = characters[currentCharIndex];
      const maxAmt = Math.min(50, Math.max(1, Math.floor(char.wallet)));
      if (maxAmt >= 1) {
        const amount = (Math.floor(Math.random() * maxAmt) + 1).toFixed(2);
        const notes = ['请收款', '给你买奶茶', '辛苦了', '小小心意', '请你吃饭'];
        return {
          content: '转账 ¥' + amount,
          read: true,
          showSystem: false,
          type: 'transfer',
          extra: { amount: parseFloat(amount), note: notes[Math.floor(Math.random() * notes.length)], status: 'pending' }
        };
      }
    } else if (rand < 0.14) {
      const char = characters[currentCharIndex];
      const maxAmt = Math.min(20, Math.max(1, Math.floor(char.wallet)));
      if (maxAmt >= 1) {
        const amount = (Math.floor(Math.random() * maxAmt) + 1).toFixed(2);
        const blessings = ['恭喜发财大吉大利', '新年快乐', '万事如意', '心想事成', '好运连连'];
        return {
          content: '红包 ¥' + amount,
          read: true,
          showSystem: false,
          type: 'redpacket',
          extra: { amount: parseFloat(amount), blessing: blessings[Math.floor(Math.random() * blessings.length)], status: 'pending' }
        };
      }
    } else if (rand < 0.19) {
      const places = ['咖啡厅', '图书馆', '公园', '商场', '奶茶店'];
      const place = places[Math.floor(Math.random() * places.length)];
      return {
        content: '位置：' + place,
        read: true,
        showSystem: false,
        type: 'location',
        extra: { place, address: '' }
      };
    } else if (rand < 0.23) {
      const descs = ['今天的午餐', '路边的花', '新买的书', '窗外的风景'];
      const desc = descs[Math.floor(Math.random() * descs.length)];
      return {
        content: desc,
        read: true,
        showSystem: false,
        type: 'photo',
        extra: { imageDesc: desc }
      };
    }
    const responses = [
      '好呀，没问题！',
      '嗯嗯，我在听呢~',
      '哈哈，有意思！',
      '好的好的，然后呢？',
      '这个我同意！',
      '让我想想...嗯，我觉得...',
      '对啊！我也是这么想的'
    ];
    return {
      content: responses[Math.floor(Math.random() * responses.length)],
      read: true,
      showSystem: false
    };
  },

  occupiedResponse(message, event) {
    const contextResponses = {
      '工作': [
        `（正在${event.location}${event.event}）嗯...稍等，我处理一下这个...好了，你说？`,
        `（手边是咖啡）${event.desc}。什么事？我边工作边听`,
        '工作ing...但可以聊两句，说吧~'
      ],
      '电影': [
        '（电影院里）嘘...正精彩呢，出来再说？',
        '看完这幕回你~等等哦',
        '在电影院呢，稍后回复你！'
      ],
      '游戏': [
        '（游戏中）团战中！打完回你！',
        '游戏中...有事留言~',
        '这局马上结束，等等！'
      ],
      '上课': [
        '（课堂上）嘘，老师在讲课呢...下课再说？',
        '上课中...偷偷回你一下',
        '这课好无聊，但不敢明目张胆玩手机...'
      ],
      '看书': [
        '（图书馆里）嗯？什么事？我正看到精彩部分呢',
        '在看书呢，不过可以聊两句~',
        '等我把这章看完...好了，说吧'
      ],
      '追剧': [
        '（追剧中）嘘！正到高潮部分！',
        '等我看完这集！马上！',
        '追剧中...有事留言~'
      ],
      'default': [
        `（正在${event.event}）稍等一下哦~`,
        `现在有点忙，${event.event}中...`,
        '忙完回你！'
      ]
    };

    const category = Object.keys(contextResponses).find(k => event.event.includes(k)) || 'default';
    const options = contextResponses[category];
    return {
      content: options[Math.floor(Math.random() * options.length)],
      read: true,
      showSystem: false
    };
  },

  offlineResponse(event) {
    return {
      content: null,
      read: false,
      showSystem: true,
      eventDesc: event ? event.desc : '对方现在不方便回复'
    };
  }
};

function renderChatList() {
  const list = document.getElementById('chat-list');
  list.innerHTML = characters.map((char, idx) => {
    const history = chatHistories[idx];
    const lastMessage = history && history.length > 0 ? history[history.length - 1] : null;
    return `
      <div class="chat-item" onclick="openChat(${idx})">
        ${renderAvatar(char.avatar, char.avatarImage)}
        <div class="chat-info">
          <div class="chat-name">
            ${char.name || char.nickname || ''}
            <span class="status-dot ${char.status}"></span>
          </div>
          <div class="chat-preview">${lastMessage ? lastMessage.content : (char.first_mes || '暂无消息')}</div>
        </div>
        <div class="chat-time">${lastMessage ? lastMessage.time : ''}</div>
      </div>
    `;
  }).join('');
}

function renderMessages() {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  const history = chatHistories[currentCharIndex];

  history.forEach((msg, index) => {
    if (msg.role === 'system') {
      container.innerHTML += `
        <div class="system-message">
          <span class="text">${msg.content}</span>
          ${msg.showActions ? `
            <div class="system-actions">
              <button onclick="showEventDetail()">查看详情</button>
              <button onclick="pokeChar()">👆 戳一戳</button>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      const wrapperClass = msg.role === 'user' ? 'user' : 'char';
      const readStatus = msg.role === 'user' ? `
        <div class="message-time">
          <span class="read-status ${msg.read ? 'read' : ''}">
            ${msg.read ? `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : '未读'}
          </span>
        </div>
      ` : `<div class="message-time">${msg.time}</div>`;

      let msgHtml = '';
      const msgType = msg.type || 'text';

      if (msgType === 'photo') {
        msgHtml = `<div class="message ${msg.role} msg-photo">${msg.extra?.imageDesc || msg.content}</div>`;
      } else if (msgType === 'video') {
        msgHtml = `<div class="message ${msg.role} msg-video" onclick="this.classList.toggle('expanded')"><div class="play-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="#FFF"><polygon points="5 3 19 12 5 21 5 3"/></svg></div><div class="video-desc">${msg.extra?.videoDesc || msg.content}</div></div>`;
      } else if (msgType === 'transfer') {
        const tStatus = msg.extra?.status || 'pending';
        const isReceiver = (msg.role === 'char');
        let tStatusHtml = '';
        if (isReceiver && tStatus === 'pending') {
          tStatusHtml = `<div class="msg-action-btns"><button class="msg-action-btn accept" onclick="acceptMsg(${index}, 'transfer')">收款</button><button class="msg-action-btn reject" onclick="rejectMsg(${index}, 'transfer')">退还</button></div>`;
        } else if (tStatus === 'accepted') {
          tStatusHtml = `<div class="msg-status-line msg-status-accepted"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${isReceiver ? '已收款' : '已被收款'}</div>`;
        } else if (tStatus === 'rejected') {
          tStatusHtml = `<div class="msg-status-line msg-status-rejected"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${isReceiver ? '已退还' : '已被退还'}</div>`;
        }
        msgHtml = `<div class="message ${msg.role} msg-transfer"><div class="msg-transfer-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>微信转账</div><div class="msg-transfer-body"><div class="msg-transfer-amount">¥${(msg.extra?.amount || 0).toFixed(2)}</div><div class="msg-transfer-note">${msg.extra?.note || '请收款'}</div>${tStatusHtml}</div></div>`;
      } else if (msgType === 'location') {
        msgHtml = `<div class="message ${msg.role} msg-location"><div class="msg-location-place"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5040" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${msg.extra?.place || msg.content}</div>${msg.extra?.address ? `<div class="msg-location-address">${msg.extra.address}</div>` : ''}</div>`;
      } else if (msgType === 'file') {
        msgHtml = `<div class="message ${msg.role} msg-file"><div class="msg-file-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="msg-file-info"><div class="msg-file-name">${msg.extra?.fileName || '文件'}</div><div class="msg-file-size">${msg.extra?.fileSize || ''}</div></div></div>`;
      } else if (msgType === 'gift') {
        const gStatus = msg.extra?.status || 'pending';
        const isGReceiver = (msg.role === 'char');
        let gStatusHtml = '';
        if (isGReceiver && gStatus === 'pending') {
          gStatusHtml = `<div class="msg-action-btns"><button class="msg-action-btn accept" onclick="acceptMsg(${index}, 'gift')">收下</button><button class="msg-action-btn reject" onclick="rejectMsg(${index}, 'gift')">退回</button></div>`;
        } else if (gStatus === 'accepted') {
          gStatusHtml = `<div class="msg-status-line msg-status-accepted"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${isGReceiver ? '已收下' : '已被收下'}</div>`;
        } else if (gStatus === 'rejected') {
          gStatusHtml = `<div class="msg-status-line msg-status-rejected"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${isGReceiver ? '已退回' : '已被退回'}</div>`;
        }
        msgHtml = `<div class="message ${msg.role} msg-gift"><div class="msg-gift-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="1.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>礼物</div><div class="msg-gift-body"><div class="msg-gift-content">${msg.extra?.giftContent || '一份礼物'}</div><div class="msg-gift-amount">¥${(msg.extra?.amount || 0).toFixed(2)}</div>${gStatusHtml}</div></div>`;
      } else if (msgType === 'redpacket') {
        const rStatus = msg.extra?.status || 'pending';
        const isReceiver = (msg.role === 'char');
        let rStatusHtml = '';
        if (isReceiver && rStatus === 'pending') {
          rStatusHtml = `<div class="msg-action-btns"><button class="msg-action-btn accept" onclick="acceptMsg(${index}, 'redpacket')">领取</button><button class="msg-action-btn reject" onclick="rejectMsg(${index}, 'redpacket')">退回</button></div>`;
        } else if (rStatus === 'accepted') {
          rStatusHtml = `<div class="msg-status-line msg-status-accepted"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${isReceiver ? '已领取' : '已被领取'}</div>`;
        } else if (rStatus === 'rejected') {
          rStatusHtml = `<div class="msg-status-line msg-status-rejected"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${isReceiver ? '已退回' : '已被退回'}</div>`;
        }
        msgHtml = `<div class="message ${msg.role} msg-redpacket"><div class="msg-redpacket-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9c4 2 6 5 9 5s5-3 9-5"/></svg>微信红包</div><div class="msg-redpacket-body"><div class="msg-redpacket-amount">¥${(msg.extra?.amount || 0).toFixed(2)}</div><div class="msg-redpacket-blessing">${msg.extra?.blessing || '恭喜发财大吉大利'}</div>${rStatusHtml}</div></div>`;
      } else if (msgType === 'action_reject_transfer' || msgType === 'action_reject_redpacket' || msgType === 'action_reject_gift') {
        const actionLabel = msgType === 'action_reject_transfer' ? '退还转账' : msgType === 'action_reject_redpacket' ? '退回红包' : '退回礼物';
        msgHtml = `<div class="message ${msg.role} msg-action-notice"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${actionLabel} ¥${(msg.extra?.amount || 0).toFixed(2)}</div>`;
      } else if (msgType === 'action_accept_transfer' || msgType === 'action_accept_redpacket' || msgType === 'action_accept_gift') {
        const actionLabel = msgType === 'action_accept_transfer' ? '收款' : msgType === 'action_accept_redpacket' ? '领取红包' : '收下礼物';
        msgHtml = `<div class="message ${msg.role} msg-action-notice msg-action-accepted"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${actionLabel} ¥${(msg.extra?.amount || 0).toFixed(2)}</div>`;
      } else {
        msgHtml = `<div class="message ${msg.role}">${msg.content}</div>`;
      }

      container.innerHTML += `
        <div class="message-wrapper ${wrapperClass}" oncontextmenu="showMsgContext(event, ${index})">
          ${msgHtml}
          ${readStatus}
        </div>
      `;
    }
  });

  container.scrollTop = container.scrollHeight;
}

function parseTag(tagStr) {
  let m;
  m = tagStr.match(/^照片[:：](.+)$/); if (m) return { type: 'photo', content: m[1], extra: { imageDesc: m[1] } };
  m = tagStr.match(/^视频[:：](.+)$/); if (m) return { type: 'video', content: m[1], extra: { videoDesc: m[1] } };
  m = tagStr.match(/^转账[:：](\d+\.?\d*)\|?(.*)$/); if (m) { const a = parseFloat(m[1]); return { type: 'transfer', content: '转账 ¥' + a.toFixed(2), extra: { amount: a, note: m[2] || '请收款', status: 'pending' } }; }
  m = tagStr.match(/^位置[:：](.+?)\|?(.*)$/); if (m) return { type: 'location', content: '位置：' + m[1], extra: { place: m[1], address: m[2] || '' } };
  m = tagStr.match(/^文件[:：](.+?)\|?(.*)$/); if (m) return { type: 'file', content: '文件：' + m[1], extra: { fileName: m[1], fileSize: m[2] || '' } };
  m = tagStr.match(/^礼物[:：](.+?)\|?(\d+\.?\d*)$/); if (m) { const a = parseFloat(m[2] || 0); return { type: 'gift', content: '礼物：' + m[1], extra: { giftContent: m[1], amount: a, status: 'pending' } }; }
  m = tagStr.match(/^红包[:：](\d+\.?\d*)\|?(.*)$/); if (m) { const a = parseFloat(m[1]); return { type: 'redpacket', content: '红包 ¥' + a.toFixed(2), extra: { amount: a, blessing: m[2] || '恭喜发财大吉大利', status: 'pending' } }; }
  m = tagStr.match(/^收款[:：](\d+\.?\d*)\|?(.*)$/); if (m) return { type: 'action_accept_transfer', content: '收款 ¥' + parseFloat(m[1]).toFixed(2), extra: { amount: parseFloat(m[1]) } };
  m = tagStr.match(/^退还转账[:：](\d+\.?\d*)\|?(.*)$/); if (m) return { type: 'action_reject_transfer', content: '退还转账 ¥' + parseFloat(m[1]).toFixed(2), extra: { amount: parseFloat(m[1]) } };
  m = tagStr.match(/^领红包[:：](\d+\.?\d*)\|?(.*)$/); if (m) return { type: 'action_accept_redpacket', content: '领取红包 ¥' + parseFloat(m[1]).toFixed(2), extra: { amount: parseFloat(m[1]) } };
  m = tagStr.match(/^退回红包[:：](\d+\.?\d*)\|?(.*)$/); if (m) return { type: 'action_reject_redpacket', content: '退回红包 ¥' + parseFloat(m[1]).toFixed(2), extra: { amount: parseFloat(m[1]) } };
  m = tagStr.match(/^收礼物[:：](.+?)\|?(.*)$/); if (m) return { type: 'action_accept_gift', content: '收下礼物：' + m[1], extra: { giftContent: m[1] } };
  m = tagStr.match(/^退回礼物[:：](.+?)\|?(.*)$/); if (m) return { type: 'action_reject_gift', content: '退回礼物：' + m[1], extra: { giftContent: m[1] } };
  return null;
}

function parseAiResponse(rawContent) {
  const tagPattern = /\[(照片|视频|转账|位置|文件|礼物|红包|收款|退还转账|领红包|退回红包|收礼物|退回礼物)[:：][^\]]+\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tagPattern.exec(rawContent)) !== null) {
    if (match.index > lastIndex) {
      const before = rawContent.substring(lastIndex, match.index).trim();
      if (before) parts.push({ type: 'text', content: before });
    }
    const inner = match[0].slice(1, -1);
    const parsed = parseTag(inner);
    if (parsed) {
      parts.push(parsed);
    } else {
      parts.push({ type: 'text', content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rawContent.length) {
    const remaining = rawContent.substring(lastIndex).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  const finalParts = [];
  for (const part of parts) {
    if (part.type === 'text') {
      const subSegments = part.content.split(/\|\|\||\n/).map(s => s.trim()).filter(s => s.length > 0);
      for (const seg of subSegments) {
        finalParts.push({ type: 'text', content: seg });
      }
    } else {
      finalParts.push(part);
    }
  }

  return finalParts.length > 0 ? finalParts : [{ type: 'text', content: rawContent }];
}

function parseUserMessage(rawLine) {
  const photoMatch = rawLine.match(/^\[照片[:：](.+)\]$/);
  if (photoMatch) return { type: 'photo', content: photoMatch[1], extra: { imageDesc: photoMatch[1] } };
  const videoMatch = rawLine.match(/^\[视频[:：](.+)\]$/);
  if (videoMatch) return { type: 'video', content: videoMatch[1], extra: { videoDesc: videoMatch[1] } };
  const transferMatch = rawLine.match(/^\[转账[:：](\d+\.?\d*)\|?(.*)\]$/);
  if (transferMatch) {
    const amount = parseFloat(transferMatch[1]);
    const note = transferMatch[2] || '请收款';
    return { type: 'transfer', content: '转账 ¥' + amount.toFixed(2), extra: { amount, note, status: 'pending' } };
  }
  const locationMatch = rawLine.match(/^\[位置[:：](.+?)\|?(.*)\]$/);
  if (locationMatch) {
    const place = locationMatch[1];
    const address = locationMatch[2] || '';
    return { type: 'location', content: '位置：' + place, extra: { place, address } };
  }
  const fileMatch = rawLine.match(/^\[文件[:：](.+?)\|?(.*)\]$/);
  if (fileMatch) return { type: 'file', content: '文件：' + fileMatch[1], extra: { fileName: fileMatch[1], fileSize: fileMatch[2] || '' } };
  const giftMatch = rawLine.match(/^\[礼物[:：](.+?)\|?(\d+\.?\d*)\]$/);
  if (giftMatch) {
    const amount = parseFloat(giftMatch[2] || 0);
    return { type: 'gift', content: '礼物：' + giftMatch[1], extra: { giftContent: giftMatch[1], amount, status: 'pending' } };
  }
  const redpacketMatch = rawLine.match(/^\[红包[:：](\d+\.?\d*)\|?(.*)\]$/);
  if (redpacketMatch) {
    const amount = parseFloat(redpacketMatch[1]);
    const blessing = redpacketMatch[2] || '恭喜发财大吉大利';
    return { type: 'redpacket', content: '红包 ¥' + amount.toFixed(2), extra: { amount, blessing, status: 'pending' } };
  }
  return { type: 'text', content: rawLine };
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (!message) return;

  const history = chatHistories[currentCharIndex];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const lines = message.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  for (const line of lines) {
    const parsed = parseUserMessage(line);
    const userMsg = {
      role: 'user',
      content: parsed.content,
      time: timeStr,
      read: false
    };
    if (parsed.type !== 'text') {
      userMsg.type = parsed.type;
      userMsg.extra = parsed.extra;
      const amt = parsed.extra?.amount || 0;
      if (amt > 0 && (parsed.type === 'transfer' || parsed.type === 'redpacket' || parsed.type === 'gift')) {
        if (userState.wallet < amt) { continue; }
        userState.wallet -= amt;
      }
    }
    history.push(userMsg);
  }

  const walletEl = document.getElementById('user-wallet');
  if (walletEl) walletEl.textContent = '¥' + userState.wallet.toFixed(2);

  input.value = '';
  renderMessages();

  const lastUserMsg = lines[lines.length - 1];
  const response = await ChatEngine.processMessage(lastUserMsg);

  if (response.read) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user' && !history[i].read) {
        history[i].read = true;
      }
    }
  }

  if (response.showSystem) {
    history.push({
      role: 'system',
      content: '对方开启了消息免打扰',
      showActions: true
    });
  } else if (response.content) {
    const parsed = parseAiResponse(response.content);
    addParsedMessagesToHistory(parsed, history, now);
  }

  EventBus.emit('chat:message-sent', { charIndex: currentCharIndex, userMsg: message, charReply: response.content });

  updateMoodFromChat(message);
  renderMessages();
  saveToLocalStorage();
}

function addParsedMessagesToHistory(parsed, history, baseTime) {
  let msgIdx = 0;
  for (const p of parsed) {
    if (p.type.startsWith('action_')) {
      const actionType = p.type.replace('action_', '');
      const isAccept = actionType.startsWith('accept_');
      const msgType = actionType.replace('accept_', '').replace('reject_', '');
      for (let j = history.length - 1; j >= 0; j--) {
        const hmsg = history[j];
        if (hmsg.role === 'user' && hmsg.type === msgType && hmsg.extra && hmsg.extra.status === 'pending') {
          hmsg.extra.status = isAccept ? 'accepted' : 'rejected';
          if (isAccept) {
            characters[currentCharIndex].wallet += (hmsg.extra.amount || 0);
          }
          break;
        }
      }
      continue;
    }
    const msgTime = new Date(baseTime.getTime() + msgIdx * 60000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const charMsg = {
      role: 'char',
      content: p.content,
      time: msgTime,
      read: true
    };
    if (p.type !== 'text') {
      charMsg.type = p.type;
      charMsg.extra = p.extra;
      const amt = p.extra?.amount || 0;
      if (amt > 0 && (p.type === 'transfer' || p.type === 'redpacket' || p.type === 'gift')) {
        characters[currentCharIndex].wallet -= amt;
      }
    }
    history.push(charMsg);
    msgIdx++;
  }
}

let msgContextIndex = -1;

function showMsgContext(event, index) {
  event.preventDefault();
  event.stopPropagation();
  msgContextIndex = index;
  const menu = document.getElementById('msg-context-menu');
  const phone = document.querySelector('.phone');
  const phoneRect = phone.getBoundingClientRect();
  let x = event.clientX - phoneRect.left;
  let y = event.clientY - phoneRect.top;
  menu.classList.add('active');
  const menuRect = menu.getBoundingClientRect();
  y = y - menuRect.height - 6;
  if (y < 8) y = event.clientY - phoneRect.top + 6;
  if (x + menuRect.width > phoneRect.width) x = phoneRect.width - menuRect.width - 8;
  if (x < 8) x = 8;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function hideMsgContext() {
  const menu = document.getElementById('msg-context-menu');
  if (menu) menu.classList.remove('active');
  msgContextIndex = -1;
}

function deleteMessage() {
  if (msgContextIndex < 0) return;
  const history = chatHistories[currentCharIndex];
  if (msgContextIndex < history.length) {
    history.splice(msgContextIndex, 1);
    renderMessages();
    saveToLocalStorage();
  }
  hideMsgContext();
}

async function regenerateMessage() {
  if (msgContextIndex < 0) return;
  const history = chatHistories[currentCharIndex];
  if (msgContextIndex >= history.length) { hideMsgContext(); return; }
  const clickedMsg = history[msgContextIndex];
  if (clickedMsg.role === 'user') {
    let userMsg = clickedMsg.content;
    let removeIndex = msgContextIndex + 1;
    while (removeIndex < history.length && history[removeIndex].role !== 'char') {
      removeIndex++;
    }
    if (removeIndex < history.length) {
      history.splice(removeIndex, 1);
    }
    renderMessages();
    saveToLocalStorage();
    const char = characters[currentCharIndex];
    const event = LifeEngine.getCurrentEvent();
    const response = await ChatEngine.callApi(userMsg, char, event);
    if (response) {
      const now = new Date();
      const parsed = parseAiResponse(response.content || '');
      addParsedMessagesToHistory(parsed, history, now);
    }
    renderMessages();
    saveToLocalStorage();
    hideMsgContext();
    return;
  }
  if (clickedMsg.role !== 'char') { hideMsgContext(); return; }
  history.splice(msgContextIndex, 1);
  let userMsg = '';
  for (let i = msgContextIndex - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      userMsg = history[i].content;
      break;
    }
  }
  renderMessages();
  saveToLocalStorage();
  const char = characters[currentCharIndex];
  const event = LifeEngine.getCurrentEvent();
  const response = await ChatEngine.callApi(userMsg, char, event);
  if (response) {
    const now = new Date();
    const parsed = parseAiResponse(response.content || '');
    addParsedMessagesToHistory(parsed, history, now);
  }
  renderMessages();
  saveToLocalStorage();
  hideMsgContext();
}

document.addEventListener('click', hideMsgContext);
document.addEventListener('contextmenu', function(e) {
  const menu = document.getElementById('msg-context-menu');
  if (menu && !menu.contains(e.target)) {
    hideMsgContext();
  }
});

function copyMessage() {
  if (msgContextIndex < 0) return;
  const history = chatHistories[currentCharIndex];
  if (msgContextIndex >= history.length) { hideMsgContext(); return; }
  const msg = history[msgContextIndex];
  const text = msg.content || '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
  hideMsgContext();
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

function quoteMessage() {
  if (msgContextIndex < 0) return;
  const history = chatHistories[currentCharIndex];
  if (msgContextIndex >= history.length) { hideMsgContext(); return; }
  const msg = history[msgContextIndex];
  const text = msg.content || '';
  const input = document.getElementById('message-input');
  const quotePrefix = '「' + text.substring(0, 30) + (text.length > 30 ? '...' : '') + '」\n';
  input.value = quotePrefix + input.value;
  input.focus();
  hideMsgContext();
}

function pokeChar() {
  const result = LifeEngine.poke();
  const history = chatHistories[currentCharIndex];

  if (result.success) {
    chatHistories[currentCharIndex] = history.filter(msg => msg.role !== 'system');

    chatHistories[currentCharIndex].push({
      role: 'char',
      content: result.message,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      read: true
    });

    updateStatusDisplay();
  } else {
    const lastSystem = chatHistories[currentCharIndex].findLast(msg => msg.role === 'system');
    if (lastSystem) {
      lastSystem.content = result.message;
      lastSystem.showActions = false;
    }
  }

  renderMessages();
  saveToLocalStorage();
}

function toggleFuncPanel() {
  const panel = document.getElementById('func-panel');
  panel.classList.toggle('active');
}

function closeFuncPanel() {
  document.getElementById('func-panel').classList.remove('active');
}

function openFuncModal(type) {
  currentFuncType = type;
  closeFuncPanel();
  const body = document.getElementById('func-modal-body');
  const title = document.getElementById('func-modal-title');

  const templates = {
    photo: {
      title: '发送照片',
      html: '<div class="func-modal-body-row"><label>照片描述</label><input type="text" id="func-input-desc" placeholder="描述这张照片..."></div>'
    },
    video: {
      title: '发送视频',
      html: '<div class="func-modal-body-row"><label>视频描述</label><input type="text" id="func-input-desc" placeholder="描述这个视频..."></div>'
    },
    transfer: {
      title: '转账',
      html: '<div class="func-modal-body-row"><label>金额</label><input type="number" id="func-input-amount" placeholder="输入金额" step="0.01"></div><div class="func-modal-body-row"><label>转账说明</label><input type="text" id="func-input-note" placeholder="请收款"></div>'
    },
    location: {
      title: '发送位置',
      html: '<div class="func-modal-body-row"><label>地点</label><input type="text" id="func-input-place" placeholder="例如：奶茶店"></div><div class="func-modal-body-row"><label>地址（可选）</label><input type="text" id="func-input-address" placeholder="详细地址"></div>'
    },
    file: {
      title: '发送文件',
      html: '<div class="func-modal-body-row"><label>选择文件</label><input type="file" id="func-input-file" style="padding:8px 0;"></div>'
    },
    gift: {
      title: '发送礼物',
      html: '<div class="func-modal-body-row"><label>礼物内容</label><input type="text" id="func-input-content" placeholder="礼物描述..."></div><div class="func-modal-body-row"><label>金额</label><input type="number" id="func-input-amount" placeholder="输入金额" step="0.01"></div>'
    },
    redpacket: {
      title: '发红包',
      html: '<div class="func-modal-body-row"><label>金额</label><input type="number" id="func-input-amount" placeholder="输入金额" step="0.01"></div><div class="func-modal-body-row"><label>祝福语</label><input type="text" id="func-input-blessing" placeholder="恭喜发财大吉大利"></div>'
    }
  };

  const tpl = templates[type];
  title.textContent = tpl.title;
  body.innerHTML = tpl.html;
  document.getElementById('func-modal').classList.add('active');
}

function closeFuncModal(e) {
  if (e && e.target.id !== 'func-modal') return;
  document.getElementById('func-modal').classList.remove('active');
}

function confirmFuncModal() {
  let tag = '';

  switch (currentFuncType) {
    case 'photo': {
      const desc = document.getElementById('func-input-desc').value.trim() || '一张照片';
      tag = '[照片:' + desc + ']';
      break;
    }
    case 'video': {
      const desc = document.getElementById('func-input-desc').value.trim() || '一个视频';
      tag = '[视频:' + desc + ']';
      break;
    }
    case 'transfer': {
      const amount = parseFloat(document.getElementById('func-input-amount').value) || 0;
      const note = document.getElementById('func-input-note').value.trim() || '请收款';
      tag = '[转账:' + amount.toFixed(2) + '|' + note + ']';
      break;
    }
    case 'location': {
      const place = document.getElementById('func-input-place').value.trim() || '未知地点';
      const address = document.getElementById('func-input-address').value.trim();
      tag = '[位置:' + place + (address ? '|' + address : '') + ']';
      break;
    }
    case 'file': {
      const fileInput = document.getElementById('func-input-file');
      const file = fileInput.files[0];
      const fileName = file ? file.name : '文件';
      const fileSize = file ? (file.size / 1024).toFixed(1) + 'KB' : '';
      tag = '[文件:' + fileName + (fileSize ? '|' + fileSize : '') + ']';
      break;
    }
    case 'gift': {
      const content = document.getElementById('func-input-content').value.trim() || '一份礼物';
      const amount = parseFloat(document.getElementById('func-input-amount').value) || 0;
      tag = '[礼物:' + content + '|' + amount.toFixed(2) + ']';
      break;
    }
    case 'redpacket': {
      const amount = parseFloat(document.getElementById('func-input-amount').value) || 0;
      const blessing = document.getElementById('func-input-blessing').value.trim() || '恭喜发财大吉大利';
      tag = '[红包:' + amount.toFixed(2) + '|' + blessing + ']';
      break;
    }
  }

  closeFuncModal();

  const input = document.getElementById('message-input');
  const currentVal = input.value;
  const needNewline = currentVal.length > 0 && !currentVal.endsWith('\n');
  input.value = currentVal + (needNewline ? '\n' : '') + tag;
  input.focus();
}

function acceptMsg(msgIndex, type) {
  const history = chatHistories[currentCharIndex];
  const msg = history[msgIndex];
  if (!msg || !msg.extra) return;
  const amount = msg.extra.amount || 0;
  msg.extra.status = 'accepted';
  if (msg.role === 'char') {
    userState.wallet += amount;
    characters[currentCharIndex].wallet -= amount;
  } else {
    characters[currentCharIndex].wallet += amount;
    userState.wallet -= amount;
  }
  document.getElementById('user-wallet').textContent = '¥' + userState.wallet.toFixed(2);
  renderMessages();
  saveToLocalStorage();
}

function rejectMsg(msgIndex, type) {
  const history = chatHistories[currentCharIndex];
  const msg = history[msgIndex];
  if (!msg || !msg.extra) return;
  const amount = msg.extra.amount || 0;
  msg.extra.status = 'rejected';
  if (msg.role === 'user') {
    userState.wallet += amount;
  } else {
    characters[currentCharIndex].wallet += amount;
  }
  document.getElementById('user-wallet').textContent = '¥' + userState.wallet.toFixed(2);
  renderMessages();
  saveToLocalStorage();
}
