let expandedPromptIndex = -1;

function renderPresetPage() {
  const select = document.getElementById('preset-select');
  select.innerHTML = presets.map((p, i) =>
    `<option value="${i}" ${i === currentPresetIndex ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  const preset = presets[currentPresetIndex];
  document.getElementById('preset-name-input').value = preset.name;
  document.getElementById('preset-temperature').value = preset.parameters.temperature;
  document.getElementById('preset-max-tokens').value = preset.parameters.maxTokens;
  document.getElementById('preset-top-p').value = preset.parameters.topP;
  document.getElementById('preset-wi-format').value = preset.wiFormat || '{0}';
  document.getElementById('preset-wb-enabled').checked = preset.worldBookEnabled !== false;
  const sfEl = document.getElementById('preset-scenario-format');
  if (sfEl) sfEl.value = preset.scenarioFormat || '[Circumstances: {{scenario}}]';
  const pfEl = document.getElementById('preset-personality-format');
  if (pfEl) pfEl.value = preset.personalityFormat || "[{{char}}'s personality: {{personality}}]";
  updateParamDisplay();
  renderPromptList();
}

function renderPromptList() {
  const preset = presets[currentPresetIndex];
  const container = document.getElementById('prompt-list');
  if (!preset.prompts || preset.prompts.length === 0) {
    container.innerHTML = '<div class="prompt-empty">暂无提示词，点击右上角 + 添加</div>';
    return;
  }

  const sorted = preset.prompts
    .map((p, i) => ({ ...p, _origIndex: i }))
    .sort((a, b) => a.injection_order - b.injection_order);

  container.innerHTML = sorted.map((prompt) => {
    const idx = prompt._origIndex;
    const isExpanded = expandedPromptIndex === idx;
    const roleClass = 'prompt-role-' + (prompt.role || 'system');
    const roleLabel = { system: 'System', user: 'User', assistant: 'Assistant' }[prompt.role || 'system'] || prompt.role;
    const isMarker = prompt.marker === true;

    return `
      <div class="prompt-item ${isExpanded ? 'expanded' : ''} ${!prompt.enabled ? 'disabled' : ''} ${isMarker ? 'marker' : ''}" data-index="${idx}">
        <div class="prompt-item-header" onclick="togglePromptExpand(${idx})">
          <span class="prompt-item-name">${isMarker ? '🔨 ' : ''}${escapeHtml(prompt.name || '未命名')}</span>
          <span class="prompt-role-tag ${roleClass}">${roleLabel}</span>
          ${isMarker ? '<span class="prompt-marker-tag">标记</span>' : ''}
          <label class="wb-switch prompt-switch" onclick="event.stopPropagation()">
            <input type="checkbox" ${prompt.enabled ? 'checked' : ''} onchange="togglePromptEnabled(${idx}, this.checked)">
            <span class="wb-switch-slider"></span>
          </label>
        </div>
        ${isExpanded ? `
        <div class="prompt-item-body">
          <div class="prompt-field">
            <label>名称</label>
            <input type="text" value="${escapeAttr(prompt.name)}" oninput="updatePromptField(${idx}, 'name', this.value)" placeholder="提示词名称">
          </div>
          <div class="prompt-field">
            <label>角色</label>
            <select onchange="updatePromptField(${idx}, 'role', this.value)">
              <option value="system" ${prompt.role === 'system' ? 'selected' : ''}>System</option>
              <option value="user" ${prompt.role === 'user' ? 'selected' : ''}>User</option>
              <option value="assistant" ${prompt.role === 'assistant' ? 'selected' : ''}>Assistant</option>
            </select>
          </div>
          <div class="prompt-field">
            <label>排序权重</label>
            <input type="number" value="${prompt.injection_order}" oninput="updatePromptField(${idx}, 'injection_order', parseInt(this.value)||0)" placeholder="越大越靠后">
          </div>
          <div class="prompt-field">
            <label>内容</label>
            <textarea rows="6" oninput="updatePromptField(${idx}, 'content', this.value)" placeholder="提示词内容...">${escapeHtml(prompt.content)}</textarea>
          </div>
          <div class="prompt-field prompt-marker-field">
            <label>标记 <span class="prompt-marker-hint" title="标记条目由系统自动填充内容（如世界书注入点），通常不需要手动编辑">[?]</span></label>
            <label class="wb-switch prompt-switch">
              <input type="checkbox" ${prompt.marker ? 'checked' : ''} onchange="updatePromptField(${idx}, 'marker', this.checked)">
              <span class="wb-switch-slider"></span>
            </label>
          </div>
          <div class="prompt-item-actions">
            <button class="prompt-action-btn prompt-move-up" onclick="movePromptUp(${idx})" title="上移">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="prompt-action-btn prompt-move-down" onclick="movePromptDown(${idx})" title="下移">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="prompt-action-btn prompt-delete-btn" onclick="deletePrompt(${idx})" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
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

function togglePromptExpand(index) {
  expandedPromptIndex = expandedPromptIndex === index ? -1 : index;
  renderPromptList();
}

function togglePromptEnabled(index, checked) {
  presets[currentPresetIndex].prompts[index].enabled = checked;
  saveToLocalStorage();
  renderPromptList();
}

function updatePromptField(index, field, value) {
  presets[currentPresetIndex].prompts[index][field] = value;
  saveToLocalStorage();
}

function addPrompt() {
  const preset = presets[currentPresetIndex];
  if (!preset.prompts) preset.prompts = [];
  const maxOrder = preset.prompts.reduce((max, p) => Math.max(max, p.injection_order || 0), 0);
  const id = 'custom-' + Date.now();
  preset.prompts.push({
    identifier: id,
    name: '新提示词',
    role: 'system',
    content: '',
    enabled: true,
    injection_order: maxOrder + 50,
    marker: false
  });
  expandedPromptIndex = preset.prompts.length - 1;
  saveToLocalStorage();
  renderPromptList();
}

function deletePrompt(index) {
  const preset = presets[currentPresetIndex];
  preset.prompts.splice(index, 1);
  expandedPromptIndex = -1;
  saveToLocalStorage();
  renderPromptList();
}

function movePromptUp(index) {
  const preset = presets[currentPresetIndex];
  if (!preset.prompts || preset.prompts.length <= 1) return;
  const sorted = preset.prompts
    .map((p, i) => ({ ...p, _origIndex: i }))
    .sort((a, b) => a.injection_order - b.injection_order);
  const sortedPos = sorted.findIndex(s => s._origIndex === index);
  if (sortedPos <= 0) return;
  const prevOrigIndex = sorted[sortedPos - 1]._origIndex;
  const tmpOrder = preset.prompts[index].injection_order;
  preset.prompts[index].injection_order = preset.prompts[prevOrigIndex].injection_order;
  preset.prompts[prevOrigIndex].injection_order = tmpOrder;
  saveToLocalStorage();
  renderPromptList();
}

function movePromptDown(index) {
  const preset = presets[currentPresetIndex];
  if (!preset.prompts || preset.prompts.length <= 1) return;
  const sorted = preset.prompts
    .map((p, i) => ({ ...p, _origIndex: i }))
    .sort((a, b) => a.injection_order - b.injection_order);
  const sortedPos = sorted.findIndex(s => s._origIndex === index);
  if (sortedPos >= sorted.length - 1) return;
  const nextOrigIndex = sorted[sortedPos + 1]._origIndex;
  const tmpOrder = preset.prompts[index].injection_order;
  preset.prompts[index].injection_order = preset.prompts[nextOrigIndex].injection_order;
  preset.prompts[nextOrigIndex].injection_order = tmpOrder;
  saveToLocalStorage();
  renderPromptList();
}

function switchPreset(index) {
  currentPresetIndex = parseInt(index);
  expandedPromptIndex = -1;
  renderPresetPage();
  saveToLocalStorage();
}

function updatePresetName(value) {
  presets[currentPresetIndex].name = value;
  const select = document.getElementById('preset-select');
  select.options[currentPresetIndex].text = value;
}

function updateParamDisplay() {
  const temp = document.getElementById('preset-temperature').value;
  const maxTokens = document.getElementById('preset-max-tokens').value;
  const topp = document.getElementById('preset-top-p').value;
  document.getElementById('temp-value').textContent = temp;
  document.getElementById('max-tokens-value').textContent = maxTokens;
  document.getElementById('topp-value').textContent = topp;
}

function savePreset() {
  const preset = presets[currentPresetIndex];
  preset.name = document.getElementById('preset-name-input').value.trim() || '未命名';
  preset.parameters.temperature = parseFloat(document.getElementById('preset-temperature').value);
  preset.parameters.maxTokens = parseInt(document.getElementById('preset-max-tokens').value) || 256;
  preset.parameters.topP = parseFloat(document.getElementById('preset-top-p').value);
  preset.wiFormat = document.getElementById('preset-wi-format')?.value || '{0}';
  preset.worldBookEnabled = document.getElementById('preset-wb-enabled')?.checked ?? true;
  preset.scenarioFormat = document.getElementById('preset-scenario-format')?.value || '[Circumstances: {{scenario}}]';
  preset.personalityFormat = document.getElementById('preset-personality-format')?.value || "[{{char}}'s personality: {{personality}}]";
  saveToLocalStorage();
  renderPresetPage();
}

function newPreset() {
  presets.push({
    name: '新预设',
    systemPrompt: '',
    prompts: [],
    parameters: {
      temperature: 0.7,
      maxTokens: 256,
      topP: 0.9
    },
    wiFormat: '{0}',
    worldBookEnabled: true,
    scenarioFormat: '[Circumstances: {{scenario}}]',
    personalityFormat: "[{{char}}'s personality: {{personality}}]"
  });
  currentPresetIndex = presets.length - 1;
  expandedPromptIndex = -1;
  saveToLocalStorage();
  renderPresetPage();
}

function deletePreset() {
  if (presets.length <= 1) {
    alert('至少保留一个预设');
    return;
  }
  presets.splice(currentPresetIndex, 1);
  currentPresetIndex = Math.min(currentPresetIndex, presets.length - 1);
  expandedPromptIndex = -1;
  saveToLocalStorage();
  renderPresetPage();
}

function triggerImportPreset() {
  document.getElementById('preset-import-file').click();
}

function importPreset(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const newPresetObj = {
        name: data.name || file.name.replace(/\.json$/i, ''),
        systemPrompt: '',
        prompts: [],
        parameters: {
          temperature: data.temperature !== undefined ? data.temperature : 0.7,
          maxTokens: data.openai_max_tokens || 256,
          topP: data.top_p !== undefined ? data.top_p : 0.9
        },
        wiFormat: data.wi_format || '{0}',
        worldBookEnabled: true,
        scenarioFormat: data.scenario_format || '[Circumstances: {{scenario}}]',
        personalityFormat: data.personality_format || "[{{char}}'s personality: {{personality}}]"
      };

      if (data.prompts && Array.isArray(data.prompts)) {
        const orderMap = {};
        if (data.prompt_order && Array.isArray(data.prompt_order)) {
          for (const po of data.prompt_order) {
            if (po.order && Array.isArray(po.order)) {
              po.order.forEach((item, i) => {
                orderMap[item.identifier] = i;
              });
            }
          }
        }

        newPresetObj.prompts = data.prompts.map((p, i) => {
          let order = p.injection_order !== undefined ? p.injection_order : (i + 1) * 50;
          if (orderMap[p.identifier] !== undefined) {
            order = orderMap[p.identifier] * 50;
          }
          const isMarker = p.marker === true || ['worldInfoBefore', 'worldInfoAfter', 'charDescription', 'charPersonality', 'scenario', 'personaDescription', 'chatHistory', 'dialogueExamples'].includes(p.identifier);
          return {
            identifier: p.identifier || 'imported-' + i,
            name: p.name || '导入提示词 ' + (i + 1),
            role: p.role || 'system',
            content: p.content || '',
            enabled: p.enabled !== false,
            injection_order: order,
            marker: isMarker
          };
        });
      }

      presets.push(newPresetObj);
      currentPresetIndex = presets.length - 1;
      expandedPromptIndex = -1;
      saveToLocalStorage();
      renderPresetPage();
      alert('导入成功！');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
  inputEl.value = '';
}

function exportPreset() {
  const preset = presets[currentPresetIndex];
  const exportData = {
    chat_completion_source: 'custom',
    custom_model: apiConfig.model || '',
    temperature: preset.parameters.temperature,
    top_p: preset.parameters.topP,
    frequency_penalty: 0,
    presence_penalty: 0,
    openai_max_context: 2000000,
    openai_max_tokens: preset.parameters.maxTokens,
    wi_format: preset.wiFormat || '{0}',
    scenario_format: preset.scenarioFormat || '[Circumstances: {{scenario}}]',
    personality_format: preset.personalityFormat || "[{{char}}'s personality: {{personality}}]",
    prompts: (preset.prompts || []).map(p => ({
      identifier: p.identifier,
      name: p.name,
      role: p.role,
      content: p.content,
      injection_position: 0,
      injection_depth: 4,
      injection_order: p.injection_order,
      enabled: p.enabled,
      system_prompt: p.role === 'system',
      forbid_overrides: false,
      marker: p.marker || false
    })),
    prompt_order: [{
      character_id: 100001,
      order: (preset.prompts || [])
        .slice()
        .sort((a, b) => a.injection_order - b.injection_order)
        .map(p => ({ identifier: p.identifier, enabled: p.enabled }))
    }]
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (preset.name || 'preset') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function saveApiConfig() {
  apiConfig.url = document.getElementById('api-url-input').value.trim();
  apiConfig.apiKey = document.getElementById('api-key-input').value.trim();
  apiConfig.model = document.getElementById('api-model-input').value.trim();
  saveToLocalStorage();
  const resultEl = document.getElementById('api-test-result');
  resultEl.textContent = '配置已保存';
  resultEl.className = 'api-test-result success';
  setTimeout(() => { resultEl.style.display = 'none'; }, 2000);
}

function loadApiConfigToUI() {
  document.getElementById('api-url-input').value = apiConfig.url || '';
  document.getElementById('api-key-input').value = apiConfig.apiKey || '';
  document.getElementById('api-model-input').value = apiConfig.model || '';
}

async function testApiConnection() {
  const resultEl = document.getElementById('api-test-result');
  const url = document.getElementById('api-url-input').value.trim();
  const apiKey = document.getElementById('api-key-input').value.trim();
  const model = document.getElementById('api-model-input').value.trim();

  if (!url || !apiKey) {
    resultEl.textContent = '请填写API端点和API Key';
    resultEl.className = 'api-test-result error';
    return;
  }

  resultEl.textContent = '测试中...';
  resultEl.className = 'api-test-result';
  resultEl.style.display = 'block';

  try {
    const response = await fetch(url + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model || 'qwen-plus',
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10
      })
    });

    if (response.ok) {
      resultEl.textContent = '连接成功！API可用';
      resultEl.className = 'api-test-result success';
    } else {
      const errorData = await response.json().catch(() => ({}));
      resultEl.textContent = '连接失败: ' + (errorData.error?.message || response.status + ' ' + response.statusText);
      resultEl.className = 'api-test-result error';
    }
  } catch (e) {
    resultEl.textContent = '连接失败: ' + e.message;
    resultEl.className = 'api-test-result error';
  }
}
