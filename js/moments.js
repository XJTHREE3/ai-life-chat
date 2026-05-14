const momentContentMap = {
  '晨跑': { content: '晨跑打卡！今天多跑了1公里~', imageDesc: '公园晨跑路线图' },
  '吃早餐': { content: '简单的早餐也是幸福', imageDesc: null },
  '工作': { content: '在咖啡厅写代码，拿铁续命中☕', imageDesc: '咖啡厅的工作台' },
  '午餐': { content: '和朋友聚餐，聊了好多', imageDesc: null },
  '购物': { content: '逛街买了好多东西，钱包在哭泣', imageDesc: '商场的购物袋' },
  '看电影': { content: '今天看的电影超好看！强烈推荐', imageDesc: null },
  '晚餐': { content: '自己做的晚饭，虽然一般但很有成就感', imageDesc: '厨房里的家常菜' },
  '打游戏': { content: '今天终于赢了一局！太爽了', imageDesc: null },
  '睡觉': { content: '晚安世界🌙', imageDesc: null },
  '上课': { content: '今天的课好无聊啊...', imageDesc: null },
  '看书': { content: '这本书太好看了，推荐！', imageDesc: '图书馆的书架' },
  '运动': { content: '傍晚跑步真舒服', imageDesc: null },
  '追剧': { content: '新出的韩剧太好看了！根本停不下来', imageDesc: '追剧截图' }
};

function generateCharMoment(charIndex) {
  const char = characters[charIndex !== undefined ? charIndex : currentCharIndex];
  const event = char.todaySchedule.find(s => s.status === 'current');
  if (!event) return null;
  const eventName = event.event;
  const data = momentContentMap[eventName] || { content: '今天也是充实的一天', imageDesc: null };
  return {
    id: Date.now(),
    author: 'char-' + charIndex,
    content: data.content,
    imageDesc: data.imageDesc,
    time: Date.now(),
    likes: [],
    comments: []
  };
}

function renderMoments() {
  const list = document.getElementById('moments-list');
  if (!list) return;

  const coverEl = document.getElementById('moments-cover');
  if (userState.coverImage) {
    coverEl.style.backgroundImage = `url(${userState.coverImage})`;
  } else {
    coverEl.style.backgroundImage = '';
  }

  document.getElementById('moments-profile-name').textContent = userState.name;
  const profileAvatar = document.getElementById('moments-profile-avatar');
  if (userState.avatarImage) {
    profileAvatar.innerHTML = `<img src="${userState.avatarImage}" alt="">`;
  } else {
    profileAvatar.innerHTML = '我';
  }

  const sortedMoments = [...moments].sort((a, b) => b.time - a.time);
  list.innerHTML = sortedMoments.map(m => {
    const char = getCharByAuthor(m.author);
    const isChar = !!char;
    const authorName = isChar ? (char.name || char.nickname) : userState.name;
    const avatarHtml = isChar
      ? (char.avatarImage
        ? `<div class="moment-avatar"><img src="${char.avatarImage}" alt=""></div>`
        : `<div class="moment-avatar" style="background:${getMorandiColor(char.name)}">${char.avatar}</div>`)
      : (userState.avatarImage
        ? `<div class="moment-avatar"><img src="${userState.avatarImage}" alt=""></div>`
        : `<div class="moment-avatar user-avatar" style="background:#FFF;color:#000;font-size:14px;">我</div>`);

    const likedByUser = m.likes.includes('user');
    const likeCount = m.likes.length;

    let likesHtml = '';
    if (likeCount > 0) {
      const likeNames = m.likes.map(l => {
        if (l === 'user') return userState.name;
        const c = getCharByAuthor(l);
        return c ? (c.name || c.nickname) : l;
      });
      likesHtml = `<div class="moment-likes-text">${likeNames.join('、')}${likeCount > 1 ? '等' + likeCount + '人' : ''}赞了</div>`;
    }

    let commentsHtml = '';
    if (m.comments.length > 0) {
      commentsHtml = `<div class="moment-comments">${m.comments.map(c => {
        const cName = c.author === 'user' ? userState.name : ((getCharByAuthor(c.author) || {}).name || (getCharByAuthor(c.author) || {}).nickname || '未知');
        return `<div class="moment-comment"><span class="comment-author">${cName}</span>：<span class="comment-content">${c.content}</span></div>`;
      }).join('')}</div>`;
    }

    const activeCommentId = 'comment-' + m.id;
    const commentInputHtml = `<div class="moment-comment-input-area" id="${activeCommentId}" style="display:none;">
      <input type="text" placeholder="写评论..." id="comment-input-${m.id}" onkeypress="if(event.key==='Enter')submitComment(${m.id})">
      <button onclick="submitComment(${m.id})">发送</button>
    </div>`;

    return `
      <div class="moment-item">
        ${avatarHtml}
        <div class="moment-body">
          <div class="moment-author">${authorName}</div>
          <div class="moment-text">${m.content}</div>
          ${m.imageDesc ? `<div class="moment-image">${m.imageDesc}</div>` : ''}
          <div class="moment-time">${formatTime(m.time)}</div>
          ${likesHtml}
          <div class="moment-actions">
            <button class="moment-action-btn ${likedByUser ? 'liked' : ''}" onclick="toggleLike(${m.id})">
              <svg viewBox="0 0 24 24" fill="${likedByUser ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              ${likeCount > 0 ? likeCount : ''}
            </button>
            <button class="moment-action-btn" onclick="showCommentInput(${m.id})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <button class="moment-action-btn moment-delete-btn" onclick="confirmDeleteMoment(${m.id})">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/>
              </svg>
            </button>
          </div>
          ${commentsHtml}
          ${commentInputHtml}
        </div>
      </div>
    `;
  }).join('');
}

function confirmDeleteMoment(momentId) {
  const m = moments.find(x => x.id === momentId);
  if (!m) return;
  showConfirmModal(
    '删除朋友圈',
    '确定删除这条朋友圈？此操作不可撤销。',
    function() {
      const idx = moments.findIndex(x => x.id === momentId);
      if (idx >= 0) {
        moments.splice(idx, 1);
        renderMoments();
        saveToLocalStorage();
      }
    }
  );
}

function toggleLike(momentId) {
  const m = moments.find(x => x.id === momentId);
  if (!m) return;
  const idx = m.likes.indexOf('user');
  if (idx >= 0) {
    m.likes.splice(idx, 1);
  } else {
    m.likes.push('user');
  }
  renderMoments();
  saveToLocalStorage();
}

function showCommentInput(momentId) {
  const el = document.getElementById('comment-' + momentId);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
    if (el.style.display === 'flex') {
      const input = document.getElementById('comment-input-' + momentId);
      if (input) input.focus();
    }
  }
}

const charReplyPool = {
  '精神': ['嗯嗯，精神满满！', '今天状态不错呢~', '对呀，活力十足！'],
  '满足': ['吃饱了才有力气嘛~', '幸福就是这么简单', '嘿嘿，满足感满满'],
  '专注': ['工作中，勿扰~', '等我忙完再聊', '认真模式开启！'],
  '开心': ['哈哈，开心最重要！', '和你聊天真开心~', '今天心情超好！'],
  '兴奋': ['太激动了！', '好兴奋好兴奋！', '根本停不下来！'],
  '放松': ['好舒服呀~', '放松一下挺好的', '享受当下~'],
  '温馨': ['家的感觉真好', '温暖~', '简简单单的幸福'],
  '困倦': ['困了...zzZ', '好想睡觉...', '眼皮在打架了...'],
  '平静': ['嗯~', '还好啦', '平平淡淡才是真'],
  '无聊': ['好无聊啊...', '什么时候下课...', '时间过得好慢'],
  '沉浸': ['这本书太好看了！', '完全停不下来~', '沉浸在书的世界里'],
  '舒畅': ['运动后真舒服！', '出了一身汗，爽~', '跑步真的很解压'],
  '入迷': ['太好看了！', '根本停不下来！', '下一集！下一集！'],
  '安静': ['嗯~', '安静的感觉真好', '享受宁静']
};

function submitComment(momentId) {
  const input = document.getElementById('comment-input-' + momentId);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;

  const m = moments.find(x => x.id === momentId);
  if (!m) return;

  m.comments.push({
    author: 'user',
    content: content,
    time: Date.now()
  });

  if (m.author.startsWith('char-') && Math.random() < 0.5) {
    const charIdx = parseInt(m.author.split('-')[1]);
    const char = characters[charIdx] || characters[0];
    const pool = charReplyPool[char.mood] || charReplyPool['平静'];
    const reply = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      m.comments.push({
        author: m.author,
        content: reply,
        time: Date.now()
      });
      renderMoments();
      saveToLocalStorage();
    }, 1500);
  }

  renderMoments();
  saveToLocalStorage();
}

function showPostModal() {
  document.getElementById('post-textarea').value = '';
  document.getElementById('post-image-desc').value = '';
  document.getElementById('post-modal').classList.add('active');
}

function closePostModal(e) {
  if (e && e.target.id !== 'post-modal') return;
  document.getElementById('post-modal').classList.remove('active');
}

function confirmPost() {
  const content = document.getElementById('post-textarea').value.trim();
  if (!content) return;
  const imageDesc = document.getElementById('post-image-desc').value.trim() || null;

  const newMoment = {
    id: Date.now(),
    author: 'user',
    content: content,
    imageDesc: imageDesc,
    time: Date.now(),
    likes: [],
    comments: []
  };

  moments.unshift(newMoment);
  closePostModal();
  renderMoments();
  saveToLocalStorage();

  if (Math.random() < 0.7) {
    setTimeout(() => {
      const likeCharIdx = Math.floor(Math.random() * characters.length);
      newMoment.likes.push('char-' + likeCharIdx);
      renderMoments();
      saveToLocalStorage();
    }, 2000);
  }
}

function handleCoverUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    userState.coverImage = e.target.result;
    renderMoments();
    saveToLocalStorage();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
