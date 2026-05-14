function saveToLocalStorage() {
  try {
    localStorage.setItem('ai-life-user', JSON.stringify(userState));
    localStorage.setItem('ai-life-characters', JSON.stringify(characters));
    localStorage.setItem('ai-life-chat-histories', JSON.stringify(chatHistories));
    localStorage.setItem('ai-life-moments', JSON.stringify(moments));
    localStorage.setItem('ai-life-presets', JSON.stringify(presets));
    localStorage.setItem('ai-life-current-preset-index', JSON.stringify(currentPresetIndex));
    localStorage.setItem('ai-life-api-config', JSON.stringify(apiConfig));
    localStorage.setItem('ai-life-worldbooks', JSON.stringify(worldBooks));
    localStorage.setItem('ai-life-current-wb-index', JSON.stringify(currentWorldBookIndex));
    localStorage.setItem('ai-life-life-agent-config', JSON.stringify(lifeAgentConfig));
    localStorage.setItem('ai-life-life-agent-mode', JSON.stringify(lifeAgentMode));
    localStorage.setItem('ai-life-life-agent-prompts', JSON.stringify(lifeAgentPrompts));
  } catch (e) {}
}

function loadFromLocalStorage() {
  try {
    const userData = localStorage.getItem('ai-life-user');
    if (userData) {
      const parsed = JSON.parse(userData);
      Object.assign(userState, parsed);
    }
    const charData = localStorage.getItem('ai-life-characters');
    if (charData) {
      const parsed = JSON.parse(charData);
      characters = parsed;
      characters.forEach(c => {
        if (!c.character_book) {
          c.character_book = { name: (c.name || c.nickname || '') + '的世界', entries: [] };
        }
        if (c.name === undefined && c.nickname) {
          c.name = c.nickname;
        }
        if (c.description === undefined) {
          c.description = c.charSetting || '';
        }
      });
    }
    const chatData = localStorage.getItem('ai-life-chat-histories');
    if (chatData) {
      const parsed = JSON.parse(chatData);
      chatHistories = parsed;
    }
    while (chatHistories.length < characters.length) {
      chatHistories.push([]);
    }
    const momentsData = localStorage.getItem('ai-life-moments');
    if (momentsData) {
      moments = JSON.parse(momentsData);
    }
    const presetsData = localStorage.getItem('ai-life-presets');
    if (presetsData) {
      presets = JSON.parse(presetsData);
      presets.forEach(p => {
        if (p.wiFormat === undefined) p.wiFormat = '{0}';
        if (p.worldBookEnabled === undefined) p.worldBookEnabled = true;
        if (p.scenarioFormat === undefined) p.scenarioFormat = '[Circumstances: {{scenario}}]';
        if (p.personalityFormat === undefined) p.personalityFormat = "[{{char}}'s personality: {{personality}}]";
        if (!p.prompts && p.systemPrompt) {
          p.prompts = [{
            identifier: 'main',
            name: '主提示词',
            role: 'system',
            content: p.systemPrompt,
            enabled: true,
            injection_order: 0,
            marker: false
          }];
        }
        if (p.prompts) {
          p.prompts.forEach(pr => {
            if (pr.marker === undefined) pr.marker = false;
          });
        }
      });
    }
    const presetIndexData = localStorage.getItem('ai-life-current-preset-index');
    if (presetIndexData) {
      currentPresetIndex = JSON.parse(presetIndexData);
    }
    const apiConfigData = localStorage.getItem('ai-life-api-config');
    if (apiConfigData) {
      Object.assign(apiConfig, JSON.parse(apiConfigData));
    }
    const worldBooksData = localStorage.getItem('ai-life-worldbooks');
    if (worldBooksData) {
      worldBooks = JSON.parse(worldBooksData);
    }
    const wbIndexData = localStorage.getItem('ai-life-current-wb-index');
    if (wbIndexData) {
      currentWorldBookIndex = JSON.parse(wbIndexData);
    }
    const lifeAgentConfigData = localStorage.getItem('ai-life-life-agent-config');
    if (lifeAgentConfigData) {
      Object.assign(lifeAgentConfig, JSON.parse(lifeAgentConfigData));
    }
    const lifeAgentModeData = localStorage.getItem('ai-life-life-agent-mode');
    if (lifeAgentModeData) {
      lifeAgentMode = JSON.parse(lifeAgentModeData);
    }
    const lifeAgentPromptsData = localStorage.getItem('ai-life-life-agent-prompts');
    if (lifeAgentPromptsData) {
      lifeAgentPrompts = JSON.parse(lifeAgentPromptsData);
    }
  } catch (e) {}
}

const MORANDI_COLORS = ['#7BA68C','#B8A088','#8B9DAF','#C48B80','#9E8BAF','#C4B47A','#7A8FA6','#A68B7A','#8AA68B','#AF8B9E','#8E8AAE','#9EB89E'];

function getMorandiColor(name) {
  const colorIndex = (name || '?').charCodeAt(0) % MORANDI_COLORS.length;
  return MORANDI_COLORS[colorIndex];
}

function renderAvatar(avatarText, avatarImage, extraClass) {
  if (avatarImage) {
    return `<div class="avatar ${extraClass || ''}"><img src="${avatarImage}" alt=""></div>`;
  }
  const bgColor = getMorandiColor(avatarText);
  return `<div class="avatar ${extraClass || ''}" style="background:${bgColor}">${avatarText}</div>`;
}

function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  if (hours < 24) return hours + '小时前';
  return days + '天前';
}

function getCharByAuthor(author) {
  if (author && author.startsWith('char-')) {
    const idx = parseInt(author.split('-')[1]);
    return characters[idx] || characters[0];
  }
  return null;
}
