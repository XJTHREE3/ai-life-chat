function renderMemo() {
  const container = document.getElementById('memo-content');
  if (!container) return;

  container.innerHTML = characters.map((char, idx) => {
    const event = char.todaySchedule.find(s => s.status === 'current');
    const avatarHtml = char.avatarImage
      ? `<div class="avatar"><img src="${char.avatarImage}" alt=""></div>`
      : `<div class="avatar" style="background:${getMorandiColor(char.name)}">${char.avatar}</div>`;

    return `
      <div class="memo-sticky" onclick="toggleMemoSticky(this)">
        <div class="memo-sticky-header">
          ${avatarHtml}
          <span class="memo-sticky-name">${char.name || char.nickname || ''}</span>
          <span class="memo-sticky-mood">${char.mood}</span>
          <span style="font-size:12px;color:var(--text-tertiary);margin-left:auto;">¥${char.wallet.toFixed(2)}</span>
        </div>
        <div class="memo-sticky-event">${event ? event.time + ' ' + event.event + ' · ' + event.location : '暂无进行中的日程'}</div>
        <div class="memo-sticky-detail">
          <div style="margin-bottom:8px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">日程</div>
            ${char.todaySchedule.filter(s => s.status === 'current' || s.status === 'pending').map(s =>
              `<div style="font-size:13px;color:var(--text-primary);padding:2px 0;">${s.time} ${s.event} · ${s.location}</div>`
            ).join('')}
          </div>
          <div style="margin-bottom:8px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">钱包</div>
            <div style="font-size:13px;color:var(--text-primary);">余额：¥${char.wallet.toFixed(2)}</div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">心情</div>
            <div style="font-size:13px;color:var(--text-primary);">${char.mood} - ${char.moodDesc}</div>
          </div>
          <div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">内心独白</div>
            <div style="font-size:13px;color:var(--text-secondary);font-style:italic;">${char.innerThought}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleMemoSticky(el) {
  el.classList.toggle('expanded');
}
