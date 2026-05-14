function executeWriteMemory(params, charIndex) {
  const char = characters[charIndex];
  if (!char.character_book) char.character_book = { name: char.name + '的世界', entries: [] };
  const existingIdx = char.character_book.entries.findIndex(e => e.comment === '记忆');
  if (existingIdx >= 0) {
    const existing = char.character_book.entries[existingIdx];
    existing.content += '\n' + params.content;
    if (params.keys && params.keys.length) {
      const existingKeys = existing.keys || [];
      const newKeys = params.keys.filter(k => !existingKeys.includes(k));
      existing.keys = existingKeys.concat(newKeys);
    }
  } else {
    char.character_book.entries.push({
      id: Date.now(),
      keys: params.keys || [],
      secondary_keys: [],
      selectiveLogic: 0,
      content: params.content,
      comment: '记忆',
      insertion_order: 50,
      enabled: true,
      constant: false,
      position: 'before_char',
      use_regex: true,
      extensions: {}
    });
  }
  EventBus.emit('life:memory-written', { charIndex, content: params.content });
  saveToLocalStorage();
}

function executeSendMessage(params, charIndex) {
  if (Math.random() > 0.05) return;
  const history = chatHistories[charIndex];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const msg = { role: 'char', content: params.content, time: timeStr, read: true };
  if (params.type && params.type !== 'text') {
    msg.type = params.type;
    if (params.extra) msg.extra = params.extra;
  }
  history.push(msg);
  EventBus.emit('life:message-sent', { charIndex, message: msg });
  saveToLocalStorage();
}

function executePostMoment(params, charIndex) {
  if (Math.random() > 0.05) return;
  const char = characters[charIndex];
  const today = new Date().toISOString().split('T')[0];
  if (char.lastMomentDate === today) return;
  char.lastMomentDate = today;
  const moment = {
    id: Date.now(),
    author: 'char-' + charIndex,
    content: params.content,
    imageDesc: params.image_desc || '',
    time: Date.now(),
    likes: [],
    comments: []
  };
  moments.unshift(moment);
  EventBus.emit('life:moment-posted', { moment });
  saveToLocalStorage();
}

function executeUpdateStatus(params, charIndex) {
  const char = characters[charIndex];
  if (params.mood) char.mood = params.mood;
  if (params.mood_desc) char.moodDesc = params.mood_desc;
  if (params.inner_thought) char.innerThought = params.inner_thought;
  EventBus.emit('life:status-updated', { charIndex, mood: params.mood, moodDesc: params.mood_desc, innerThought: params.inner_thought });
  saveToLocalStorage();
}

function executeUpdateSchedule(params, charIndex) {
  const char = characters[charIndex];
  const schedule = char.todaySchedule;
  const currentIdx = schedule.findIndex(s => s.status === 'current');
  if (params.action === 'advance' && currentIdx >= 0 && currentIdx < schedule.length - 1) {
    schedule[currentIdx].status = 'done';
    const nextEvent = schedule[currentIdx + 1];
    nextEvent.status = 'current';
    LifeEngine.updateStatus(nextEvent, charIndex);
    LifeEngine.updateLocation(nextEvent.location, charIndex);
    LifeEngine.updateWallet(nextEvent.cost, charIndex);
    updateMood(nextEvent, charIndex);
  } else if (params.action === 'modify' && currentIdx >= 0 && params.new_desc) {
    schedule[currentIdx].desc = params.new_desc;
  }
  saveToLocalStorage();
}
