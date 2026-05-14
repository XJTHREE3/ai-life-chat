function updateMood(event, charIndex) {
  const eventName = event.event;
  const moodData = moodMap[eventName];
  const char = characters[charIndex !== undefined ? charIndex : currentCharIndex];
  if (moodData) {
    char.mood = moodData.mood;
    char.moodDesc = moodData.moodDesc;
    char.innerThought = moodData.innerThought;
  } else {
    char.mood = '平静';
    char.moodDesc = '一切如常';
    char.innerThought = '今天也是充实的一天...';
  }
}

function updateMoodFromChat(userMessage) {
  const positiveWords = ['开心', '哈哈', '厉害', '好棒', '太好了', '不错', '加油', '喜欢', '优秀', '赞'];
  const negativeWords = ['难过', '无聊', '烦', '累', '讨厌', '伤心', '郁闷', '生气', '糟糕', '失望'];
  const msg = userMessage;
  let hasPositive = positiveWords.some(w => msg.includes(w));
  let hasNegative = negativeWords.some(w => msg.includes(w));
  const char = characters[currentCharIndex];
  if (hasPositive) {
    char.moodDesc = char.moodDesc.replace(/(.+)/, '$1，和你聊天更开心了');
  } else if (hasNegative) {
    char.moodDesc = char.moodDesc.replace(/(.+)/, '$1，有点担心你呢');
  }
}

function renderSchedule() {
  const list = document.getElementById('schedule-list-page-list');
  if (!list) return;
  list.innerHTML = characters.map((char, idx) => {
    const avatarHtml = char.avatarImage
      ? `<div class="avatar"><img src="${char.avatarImage}" alt=""></div>`
      : `<div class="avatar" style="background:${getMorandiColor(char.name)}">${char.avatar}</div>`;
    return `
      <div class="schedule-char-section">
        <div class="schedule-char-header">
          ${avatarHtml}
          <span>${char.name || char.nickname || ''}</span>
        </div>
        ${char.todaySchedule.map(item => {
          const tagClass = item.status === 'current' ? 'current' : item.status === 'done' ? 'done' : '';
          const tagText = item.status === 'done' ? '已完成' : item.status === 'current' ? '进行中' : '待完成';

          return `
            <div class="schedule-item ${item.status === 'current' ? 'current' : ''} schedule-item-char${idx}">
              <div class="schedule-time">${item.time}</div>
              <div class="schedule-content">
                <div class="schedule-title">
                  ${item.event}
                  <span class="schedule-tag ${tagClass}">${tagText}</span>
                </div>
                <div class="schedule-location">📍 ${item.location}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function updateStatusDisplay() {
  const statusText = {
    'online': '在线',
    'occupied': '忙碌',
    'offline': '免打扰'
  };
  document.getElementById('detail-status').textContent = statusText[characters[currentCharIndex].status];
}

function showEventDetail() {
  const event = LifeEngine.getCurrentEvent();
  if (event) {
    alert(`当前事件：${event.event}\n地点：${event.location}\n详情：${event.desc}`);
  }
}
