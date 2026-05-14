function updateDesktopTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeEl = document.getElementById('desktop-time');
  if (timeEl) timeEl.textContent = hours + ':' + minutes;
  const statusBarTime = document.querySelector('.status-bar .time');
  if (statusBarTime) statusBarTime.textContent = hours + ':' + minutes;
  const dateEl = document.getElementById('desktop-date');
  if (dateEl) {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDay = weekDays[now.getDay()];
    dateEl.textContent = month + '月' + day + '日 ' + weekDay;
  }
}

updateDesktopTime();
setInterval(updateDesktopTime, 30000);

function initDesktopDrag() {
  const grid = document.getElementById('desktop-icons-grid');
  if (!grid) return;
  let dragEl = null;
  let isDragging = false;
  let longPressTimer = null;
  let startX = 0, startY = 0;

  function startDrag(icon) {
    dragEl = icon;
    isDragging = true;
    icon.classList.add('dragging');
  }

  function endDrag() {
    if (dragEl) {
      dragEl.classList.remove('dragging');
    }
    document.querySelectorAll('.desktop-icon.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragEl = null;
    isDragging = false;
    longPressTimer = null;
  }

  function getIconAtPoint(x, y) {
    const icons = grid.querySelectorAll('.desktop-icon');
    for (const icon of icons) {
      if (icon === dragEl) continue;
      const rect = icon.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return icon;
      }
    }
    return null;
  }

  function swapIcons(a, b) {
    const allIcons = [...grid.querySelectorAll('.desktop-icon')];
    const idxA = allIcons.indexOf(a);
    const idxB = allIcons.indexOf(b);
    if (idxA < idxB) {
      grid.insertBefore(b, a);
      grid.insertBefore(a, allIcons[idxB + 1] || null);
    } else {
      grid.insertBefore(a, b);
      grid.insertBefore(b, allIcons[idxA + 1] || null);
    }
  }

  grid.addEventListener('click', (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  grid.addEventListener('mousedown', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    startX = e.clientX;
    startY = e.clientY;
    longPressTimer = setTimeout(() => {
      startDrag(icon);
    }, 400);
  });

  document.addEventListener('mousemove', (e) => {
    if (longPressTimer && !isDragging) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 5 || dy > 5) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
    if (!isDragging || !dragEl) return;
    e.preventDefault();
    const target = getIconAtPoint(e.clientX, e.clientY);
    document.querySelectorAll('.desktop-icon.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (target) {
      target.classList.add('drag-over');
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (!isDragging || !dragEl) return;
    const target = getIconAtPoint(e.clientX, e.clientY);
    if (target) {
      swapIcons(dragEl, target);
    }
    endDrag();
  });

  grid.addEventListener('touchstart', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    longPressTimer = setTimeout(() => {
      startDrag(icon);
    }, 400);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (longPressTimer && !isDragging) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 5 || dy > 5) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
    if (!isDragging || !dragEl) return;
    const touch = e.touches[0];
    const target = getIconAtPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.desktop-icon.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (target) {
      target.classList.add('drag-over');
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (!isDragging || !dragEl) return;
    const touch = e.changedTouches[0];
    const target = getIconAtPoint(touch.clientX, touch.clientY);
    if (target) {
      swapIcons(dragEl, target);
    }
    endDrag();
  });
}

initDesktopDrag();
