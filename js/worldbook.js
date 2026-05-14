const AND_ANY = 0;
const NOT_ALL = 1;
const NOT_ANY = 2;
const AND_ALL = 3;

function substituteVars(text, vars) {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
    });
}

function formatWorldBookEntry(content, format) {
    if (!format) format = '{0}';
    return format.replace('{0}', content);
}

function matchWorldBookEntries(messages, entries) {
    const activated = [];

    for (const entry of entries) {
        if (!entry.enabled) continue;

        if (entry.constant) {
            activated.push(entry);
            continue;
        }

        const depth = entry.scanDepth !== undefined ? entry.scanDepth : 2;
        const scanMessages = messages.slice(-depth);
        const scanText = scanMessages.map(m => m.content).join('\n');

        const keys = entry.keys || [];
        if (keys.length === 0) continue;

        const primaryMatch = keys.some(key => {
            if (!key) return false;
            if (entry.caseSensitive) {
                return scanText.includes(key);
            }
            return scanText.toLowerCase().includes(key.toLowerCase());
        });

        if (!primaryMatch) continue;

        const secKeys = entry.secondary_keys || entry.secondaryKeys || [];
        if (secKeys.length > 0) {
            const secLogic = entry.selectiveLogic !== undefined ? entry.selectiveLogic : (entry.selective !== false ? AND_ANY : AND_ALL);
            const secondaryPass = checkSecondaryKeys(
                scanText,
                secKeys,
                secLogic,
                entry.caseSensitive
            );
            if (!secondaryPass) continue;
        }

        activated.push(entry);
    }

    activated.sort((a, b) => (a.insertion_order || a.order || 100) - (b.insertion_order || b.order || 100));
    return activated;
}

function checkSecondaryKeys(scanText, secondaryKeys, logic, caseSensitive) {
    if (!secondaryKeys || secondaryKeys.length === 0) return true;

    const matches = secondaryKeys.map(key => {
        if (!key) return false;
        if (caseSensitive) {
            return scanText.includes(key);
        }
        return scanText.toLowerCase().includes(key.toLowerCase());
    });

    switch (logic) {
        case AND_ANY:
            return matches.some(Boolean);
        case AND_ALL:
            return matches.every(Boolean);
        case NOT_ANY:
            return !matches.some(Boolean);
        case NOT_ALL:
            return !matches.every(Boolean);
        default:
            return true;
    }
}

function getWorldBookContext(charIndex, chatHistory) {
    const character = characters[charIndex];
    if (!character) return [];

    if (character.character_book && character.character_book.entries && character.character_book.entries.length > 0) {
        return matchWorldBookEntries(chatHistory, character.character_book.entries);
    }

    if (character.worldBookId !== undefined && character.worldBookId !== null && character.worldBookId !== -1) {
        const worldBook = worldBooks.find(wb => wb.id === character.worldBookId);
        if (worldBook && worldBook.entries && worldBook.entries.length > 0) {
            return matchWorldBookEntries(chatHistory, worldBook.entries);
        }
    }

    return [];
}

function createWorldBook(name) {
    const worldBook = {
        id: Date.now(),
        name: name,
        entries: []
    };
    worldBooks.push(worldBook);
    return worldBook;
}

function deleteWorldBook(id) {
    const index = worldBooks.findIndex(wb => wb.id === id);
    if (index === -1) return;
    worldBooks.splice(index, 1);
    for (const character of characters) {
        if (character.worldBookId === id) {
            character.worldBookId = null;
        }
    }
}

function createEntry(worldBookId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) return null;
    const entry = {
        id: Date.now(),
        keys: [],
        secondary_keys: [],
        selectiveLogic: 0,
        content: '',
        comment: '',
        insertion_order: 100,
        enabled: true,
        constant: false,
        position: 'after_char',
        use_regex: true,
        scanDepth: 2,
        caseSensitive: false,
        extensions: {}
    };
    worldBook.entries.push(entry);
    return entry;
}

function createCharBookEntry() {
    return {
        id: Date.now(),
        keys: [],
        secondary_keys: [],
        comment: '',
        content: '',
        constant: false,
        selective: true,
        insertion_order: 100,
        enabled: true,
        position: 'after_char',
        use_regex: true,
        extensions: {}
    };
}

function deleteEntry(worldBookId, entryId) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) return;
    const index = worldBook.entries.findIndex(e => e.id === entryId);
    if (index === -1) return;
    worldBook.entries.splice(index, 1);
}

function updateEntry(worldBookId, entryId, updates) {
    const worldBook = worldBooks.find(wb => wb.id === worldBookId);
    if (!worldBook) return null;
    const entry = worldBook.entries.find(e => e.id === entryId);
    if (!entry) return null;
    for (const key of Object.keys(updates)) {
        entry[key] = updates[key];
    }
    return entry;
}

function wbEscapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWorldBookPage() {
    const select = document.getElementById('wb-select');
    select.innerHTML = worldBooks.map((wb, i) =>
        `<option value="${i}" ${i === currentWorldBookIndex ? 'selected' : ''}>${wb.name}</option>`
    ).join('');
    renderEntriesList();
}

function switchWorldBook(index) {
    currentWorldBookIndex = parseInt(index);
    renderEntriesList();
    saveToLocalStorage();
}

function newWorldBook() {
    currentEditType = 'new-worldbook';
    if (typeof document !== 'undefined') {
        const titleEl = document.getElementById('edit-modal-title');
        const textareaEl = document.getElementById('edit-textarea');
        if (titleEl) titleEl.textContent = '新建世界书';
        if (textareaEl) {
            textareaEl.value = '';
            textareaEl.placeholder = '输入世界书名称...';
        }
        const modal = document.getElementById('edit-modal');
        if (modal) modal.classList.add('active');
    }
}

function importWorldBook(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            let rawEntries = data.entries || data.character_book?.entries || [];
            if (!Array.isArray(rawEntries) && typeof rawEntries === 'object') {
                rawEntries = Object.keys(rawEntries).sort((a, b) => parseInt(a) - parseInt(b)).map(k => rawEntries[k]);
            }
            const name = data.name || data.character_book?.name || file.name.replace(/\.json$/i, '');
            const worldBook = {
                id: Date.now(),
                name: name,
                entries: rawEntries.map((entry, i) => {
                    const keys = Array.isArray(entry.keys) ? entry.keys
                        : Array.isArray(entry.key) ? entry.key : [];
                    const secKeys = Array.isArray(entry.secondary_keys) ? entry.secondary_keys
                        : Array.isArray(entry.keysecondary) ? entry.keysecondary
                        : Array.isArray(entry.secondaryKeys) ? entry.secondaryKeys : [];
                    const insertionOrder = entry.insertion_order !== undefined ? entry.insertion_order
                        : entry.order !== undefined ? entry.order : 100;
                    const enabled = entry.enabled !== undefined ? entry.enabled
                        : !entry.disable;
                    const posNum = entry.position;
                    const position = typeof posNum === 'number'
                        ? (posNum === 0 ? 'before_char' : 'after_char')
                        : (entry.position || 'after_char');
                    return {
                        id: entry.uid !== undefined ? entry.uid : (entry.id !== undefined ? entry.id : i),
                        keys: keys,
                        secondary_keys: secKeys,
                        comment: entry.comment || '',
                        content: entry.content || '',
                        constant: entry.constant || false,
                        selective: entry.selective !== false,
                        selectiveLogic: entry.selectiveLogic !== undefined ? entry.selectiveLogic : 0,
                        insertion_order: insertionOrder,
                        enabled: enabled,
                        position: position,
                        use_regex: entry.use_regex !== false,
                        scanDepth: entry.scanDepth || 2,
                        caseSensitive: entry.caseSensitive || false,
                        extensions: entry.extensions || {}
                    };
                })
            };
            worldBooks.push(worldBook);
            currentWorldBookIndex = worldBooks.length - 1;
            renderWorldBookPage();
            saveToLocalStorage();
            alert('世界书导入成功！');
        } catch (err) {
            alert('导入失败：' + err.message);
        }
    };
    reader.readAsText(file);
    inputEl.value = '';
}

function exportWorldBook() {
    const wb = worldBooks[currentWorldBookIndex];
    if (!wb) return;
    const blob = new Blob([JSON.stringify(wb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (wb.name || 'worldbook') + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function deleteCurrentWorldBook() {
    if (worldBooks.length <= 1) {
        alert('至少保留一个世界书');
        return;
    }
    showConfirmModal(
        '删除世界书',
        '确定删除当前世界书"' + (worldBooks[currentWorldBookIndex]?.name || '') + '"？',
        function() {
            const wb = worldBooks[currentWorldBookIndex];
            deleteWorldBook(wb.id);
            currentWorldBookIndex = Math.min(currentWorldBookIndex, worldBooks.length - 1);
            renderWorldBookPage();
            saveToLocalStorage();
        }
    );
}

function renderEntriesList() {
    const container = document.getElementById('wb-entries-list');
    const wb = worldBooks[currentWorldBookIndex];
    if (!wb) { container.innerHTML = ''; return; }
    container.innerHTML = wb.entries.map((entry) => {
        const keysStr = (entry.keys || []).join(', ') || '无关键词';
        const badges = [];
        if (entry.constant) badges.push('<span class="wb-badge wb-badge-constant">常驻</span>');
        if (!entry.enabled) badges.push('<span class="wb-badge wb-badge-disabled">已禁用</span>');
        const pos = entry.position || 'after_char';
        const posLabel = pos === 'before_char' ? '角色前' : '角色后';
        badges.push(`<span class="wb-badge wb-badge-${pos}">${posLabel}</span>`);
        const secKeys = entry.secondary_keys || entry.secondaryKeys || [];
        return `
      <div class="wb-entry" id="wb-entry-${entry.id}">
        <div class="wb-entry-header" onclick="toggleEntry(${entry.id})">
          <span class="wb-entry-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
          <div class="wb-entry-info">
            <div class="wb-entry-comment">${entry.comment || '未命名条目'}</div>
            <div class="wb-entry-keys">${keysStr}</div>
          </div>
          <div class="wb-entry-badges">${badges.join('')}</div>
          <button class="wb-entry-delete" onclick="event.stopPropagation();deleteEntryById(${entry.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="wb-entry-body">
          <div class="wb-field">
            <label class="wb-field-label">标注</label>
            <input type="text" value="${wbEscapeHtml(entry.comment)}" oninput="updateEntryField(${entry.id}, 'comment', this.value)">
          </div>
          <div class="wb-field">
            <label class="wb-field-label">关键词（逗号分隔）</label>
            <input type="text" value="${(entry.keys || []).join(', ')}" oninput="updateEntryKeys(${entry.id}, this.value)">
          </div>
          <div class="wb-field">
            <label class="wb-field-label">次关键词（逗号分隔）</label>
            <input type="text" value="${secKeys.join(', ')}" oninput="updateEntrySecondaryKeys(${entry.id}, this.value)">
          </div>
          <div class="wb-field">
            <label class="wb-field-label">次关键词逻辑</label>
            <select onchange="updateEntryField(${entry.id}, 'selectiveLogic', parseInt(this.value))">
              <option value="0" ${entry.selectiveLogic === 0 ? 'selected' : ''}>AND ANY（任一匹配）</option>
              <option value="1" ${entry.selectiveLogic === 1 ? 'selected' : ''}>NOT ALL（非全部匹配）</option>
              <option value="2" ${entry.selectiveLogic === 2 ? 'selected' : ''}>NOT ANY（无一匹配）</option>
              <option value="3" ${entry.selectiveLogic === 3 ? 'selected' : ''}>AND ALL（全部匹配）</option>
            </select>
          </div>
          <div class="wb-field">
            <label class="wb-field-label">内容</label>
            <textarea rows="4" oninput="updateEntryField(${entry.id}, 'content', this.value)">${wbEscapeHtml(entry.content)}</textarea>
          </div>
          <div class="wb-field-row">
            <div class="wb-field" style="flex:1">
              <label class="wb-field-label">优先级</label>
              <input type="number" value="${entry.insertion_order || entry.order || 100}" min="0" max="9999" oninput="updateEntryField(${entry.id}, 'insertion_order', parseInt(this.value) || 0)">
            </div>
            <div class="wb-field" style="flex:1">
              <label class="wb-field-label">扫描深度</label>
              <input type="number" value="${entry.scanDepth || 2}" min="1" max="100" oninput="updateEntryField(${entry.id}, 'scanDepth', parseInt(this.value) || 2)">
            </div>
          </div>
          <div class="wb-field">
            <label class="wb-field-label">注入位置</label>
            <select onchange="updateEntryField(${entry.id}, 'position', this.value)">
              <option value="before_char" ${pos === 'before_char' ? 'selected' : ''}>角色前 (before_char)</option>
              <option value="after_char" ${pos === 'after_char' ? 'selected' : ''}>角色后 (after_char)</option>
            </select>
          </div>
          <div class="wb-switch-row">
            <span class="wb-switch-label">启用</span>
            <label class="wb-switch">
              <input type="checkbox" ${entry.enabled ? 'checked' : ''} onchange="updateEntryField(${entry.id}, 'enabled', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
          <div class="wb-switch-row">
            <span class="wb-switch-label">常驻激活</span>
            <label class="wb-switch">
              <input type="checkbox" ${entry.constant ? 'checked' : ''} onchange="updateEntryField(${entry.id}, 'constant', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
          <div class="wb-switch-row">
            <span class="wb-switch-label">区分大小写</span>
            <label class="wb-switch">
              <input type="checkbox" ${entry.caseSensitive ? 'checked' : ''} onchange="updateEntryField(${entry.id}, 'caseSensitive', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function renderCharBookEntries(charIndex) {
    const char = characters[charIndex];
    if (!char) return '';
    if (!char.character_book) {
        char.character_book = { name: char.name + '的世界', entries: [] };
    }
    const entries = char.character_book.entries || [];
    if (entries.length === 0) {
        return '<div class="wb-empty">暂无世界书条目，点击下方按钮添加</div>';
    }
    return entries.map((entry) => {
        const keysStr = (entry.keys || []).join(', ') || '无关键词';
        const badges = [];
        if (entry.constant) badges.push('<span class="wb-badge wb-badge-constant">常驻</span>');
        if (!entry.enabled) badges.push('<span class="wb-badge wb-badge-disabled">已禁用</span>');
        const pos = entry.position || 'after_char';
        const posLabel = pos === 'before_char' ? '角色前' : '角色后';
        badges.push(`<span class="wb-badge wb-badge-${pos}">${posLabel}</span>`);
        const secKeys = entry.secondary_keys || entry.secondaryKeys || [];
        return `
      <div class="wb-entry" id="cb-entry-${entry.id}">
        <div class="wb-entry-header" onclick="toggleCharBookEntry(${charIndex}, ${entry.id})">
          <span class="wb-entry-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
          <div class="wb-entry-info">
            <div class="wb-entry-comment">${entry.comment || '未命名条目'}</div>
            <div class="wb-entry-keys">${keysStr}</div>
          </div>
          <div class="wb-entry-badges">${badges.join('')}</div>
          <button class="wb-entry-delete" onclick="event.stopPropagation();deleteCharBookEntry(${charIndex}, ${entry.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="wb-entry-body">
          <div class="wb-field">
            <label class="wb-field-label">标注</label>
            <input type="text" value="${wbEscapeHtml(entry.comment)}" oninput="updateCharBookField(${charIndex}, ${entry.id}, 'comment', this.value)">
          </div>
          <div class="wb-field">
            <label class="wb-field-label">关键词（逗号分隔）</label>
            <input type="text" value="${(entry.keys || []).join(', ')}" oninput="updateCharBookKeys(${charIndex}, ${entry.id}, this.value)">
          </div>
          <div class="wb-field">
            <label class="wb-field-label">次关键词（逗号分隔）</label>
            <input type="text" value="${secKeys.join(', ')}" oninput="updateCharBookSecKeys(${charIndex}, ${entry.id}, this.value)">
          </div>
          <div class="wb-field">
            <label class="wb-field-label">内容</label>
            <textarea rows="4" oninput="updateCharBookField(${charIndex}, ${entry.id}, 'content', this.value)">${wbEscapeHtml(entry.content)}</textarea>
          </div>
          <div class="wb-field-row">
            <div class="wb-field" style="flex:1">
              <label class="wb-field-label">优先级</label>
              <input type="number" value="${entry.insertion_order || 100}" min="0" max="9999" oninput="updateCharBookField(${charIndex}, ${entry.id}, 'insertion_order', parseInt(this.value) || 0)">
            </div>
            <div class="wb-field" style="flex:1">
              <label class="wb-field-label">注入位置</label>
              <select onchange="updateCharBookField(${charIndex}, ${entry.id}, 'position', this.value)">
                <option value="before_char" ${pos === 'before_char' ? 'selected' : ''}>角色前</option>
                <option value="after_char" ${pos === 'after_char' ? 'selected' : ''}>角色后</option>
              </select>
            </div>
          </div>
          <div class="wb-switch-row">
            <span class="wb-switch-label">启用</span>
            <label class="wb-switch">
              <input type="checkbox" ${entry.enabled ? 'checked' : ''} onchange="updateCharBookField(${charIndex}, ${entry.id}, 'enabled', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
          <div class="wb-switch-row">
            <span class="wb-switch-label">常驻激活</span>
            <label class="wb-switch">
              <input type="checkbox" ${entry.constant ? 'checked' : ''} onchange="updateCharBookField(${charIndex}, ${entry.id}, 'constant', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function toggleCharBookEntry(charIndex, entryId) {
    const el = document.getElementById('cb-entry-' + entryId);
    if (el) el.classList.toggle('expanded');
}

function addCharBookEntry(charIndex) {
    const char = characters[charIndex];
    if (!char) return;
    if (!char.character_book) {
        char.character_book = { name: char.name + '的世界', entries: [] };
    }
    char.character_book.entries.push(createCharBookEntry());
    saveToLocalStorage();
    if (typeof openCharInfo === 'function') openCharInfo(charIndex);
}

function deleteCharBookEntry(charIndex, entryId) {
    const char = characters[charIndex];
    if (!char || !char.character_book) return;
    const idx = char.character_book.entries.findIndex(e => e.id === entryId);
    if (idx === -1) return;
    char.character_book.entries.splice(idx, 1);
    saveToLocalStorage();
    if (typeof openCharInfo === 'function') openCharInfo(charIndex);
}

function updateCharBookField(charIndex, entryId, field, value) {
    const char = characters[charIndex];
    if (!char || !char.character_book) return;
    const entry = char.character_book.entries.find(e => e.id === entryId);
    if (!entry) return;
    entry[field] = value;
    if (field === 'enabled' || field === 'constant' || field === 'position') {
        if (typeof openCharInfo === 'function') openCharInfo(charIndex);
    }
    saveToLocalStorage();
}

function updateCharBookKeys(charIndex, entryId, value) {
    const char = characters[charIndex];
    if (!char || !char.character_book) return;
    const entry = char.character_book.entries.find(e => e.id === entryId);
    if (!entry) return;
    entry.keys = value.split(/[,，]/).map(k => k.trim()).filter(k => k);
    saveToLocalStorage();
}

function updateCharBookSecKeys(charIndex, entryId, value) {
    const char = characters[charIndex];
    if (!char || !char.character_book) return;
    const entry = char.character_book.entries.find(e => e.id === entryId);
    if (!entry) return;
    entry.secondary_keys = value.split(/[,，]/).map(k => k.trim()).filter(k => k);
    saveToLocalStorage();
}

function toggleEntry(entryId) {
    const el = document.getElementById('wb-entry-' + entryId);
    if (el) el.classList.toggle('expanded');
}

function addNewEntry() {
    const wb = worldBooks[currentWorldBookIndex];
    if (!wb) return;
    createEntry(wb.id);
    renderEntriesList();
    saveToLocalStorage();
    const entries = wb.entries;
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
        setTimeout(() => {
            const el = document.getElementById('wb-entry-' + lastEntry.id);
            if (el) el.classList.add('expanded');
        }, 50);
    }
}

function deleteEntryById(entryId) {
    showConfirmModal(
        '删除条目',
        '确定删除此世界书条目？',
        function() {
            const wb = worldBooks[currentWorldBookIndex];
            if (!wb) return;
            deleteEntry(wb.id, entryId);
            renderEntriesList();
            saveToLocalStorage();
        }
    );
}

function updateEntryField(entryId, field, value) {
    const wb = worldBooks[currentWorldBookIndex];
    if (!wb) return;
    updateEntry(wb.id, entryId, { [field]: value });
    if (field === 'enabled' || field === 'constant' || field === 'position') {
        renderEntriesList();
    }
    saveToLocalStorage();
}

function updateEntryKeys(entryId, value) {
    const wb = worldBooks[currentWorldBookIndex];
    if (!wb) return;
    const keys = value.split(/[,，]/).map(k => k.trim()).filter(k => k);
    updateEntry(wb.id, entryId, { keys });
    saveToLocalStorage();
}

function updateEntrySecondaryKeys(entryId, value) {
    const wb = worldBooks[currentWorldBookIndex];
    if (!wb) return;
    const keys = value.split(/[,，]/).map(k => k.trim()).filter(k => k);
    updateEntry(wb.id, entryId, { secondary_keys: keys });
    saveToLocalStorage();
}
