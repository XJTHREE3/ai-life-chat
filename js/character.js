function createDefaultCharacter(name) {
  return {
    name: name || '新角色',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    mes_example: '',
    alternate_greetings: [],
    tags: [],
    system_prompt: '',
    post_history_instructions: '',
    creator: '',
    character_version: '1.0',
    spec: 'chara_card_v3',
    spec_version: '3.0',
    extensions: {
      talkativeness: '0.5',
      fav: false,
      depth_prompt: { prompt: '', depth: 4, role: 'system' }
    },
    character_book: {
      name: name ? name + '的世界' : '新世界',
      entries: []
    },
    avatar: name ? name.charAt(0) : '新',
    avatarImage: null,
    status: 'online',
    location: '',
    wallet: 100.00,
    mood: '平静',
    moodDesc: '',
    innerThought: '',
    hasPostedToday: false,
    lastPostDate: '',
    todaySchedule: []
  };
}

function addCharacter(charData) {
  characters.push(charData);
  chatHistories.push([]);
  saveToLocalStorage();
}

function deleteCharacter(index) {
  if (characters.length <= 1) return;
  characters.splice(index, 1);
  chatHistories.splice(index, 1);
  if (currentCharIndex >= characters.length) {
    currentCharIndex = characters.length - 1;
  }
  saveToLocalStorage();
}

function importCharacterCard(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const card = data.data || data;
      const charData = createDefaultCharacter(card.name || '导入角色');
      charData.name = card.name || charData.name;
      charData.description = card.description || '';
      charData.personality = card.personality || '';
      charData.scenario = card.scenario || '';
      charData.first_mes = card.first_mes || '';
      charData.mes_example = card.mes_example || '';
      charData.system_prompt = card.system_prompt || '';
      charData.post_history_instructions = card.post_history_instructions || '';
      charData.tags = card.tags || [];
      charData.creator = card.creator || '';
      charData.character_version = card.character_version || '1.0';
      charData.spec = card.spec || 'chara_card_v3';
      charData.spec_version = card.spec_version || '3.0';
      charData.alternate_greetings = card.alternate_greetings || [];
      if (card.extensions) {
        charData.extensions = Object.assign(charData.extensions, card.extensions);
      }
      if (card.character_book && card.character_book.entries) {
        charData.character_book = {
          name: card.character_book.name || (charData.name + '的世界'),
          entries: card.character_book.entries.map((entry, i) => ({
            id: entry.id !== undefined ? entry.id : i,
            keys: Array.isArray(entry.keys) ? entry.keys : [],
            secondary_keys: Array.isArray(entry.secondary_keys) ? entry.secondary_keys : [],
            comment: entry.comment || '',
            content: entry.content || '',
            constant: entry.constant || false,
            selective: entry.selective !== false,
            insertion_order: entry.insertion_order !== undefined ? entry.insertion_order : 100,
            enabled: entry.enabled !== false,
            position: entry.position || 'after_char',
            use_regex: entry.use_regex !== false,
            extensions: entry.extensions || {}
          }))
        };
      }
      charData.avatar = charData.name.charAt(0);
      addCharacter(charData);
      renderChatList();
      alert('角色卡导入成功！');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
  inputEl.value = '';
}

function exportCharacterCard(index) {
  const char = characters[index];
  const exportData = {
    name: char.name,
    description: char.description,
    personality: char.personality,
    scenario: char.scenario,
    first_mes: char.first_mes,
    mes_example: char.mes_example,
    creatorcomment: '',
    avatar: 'none',
    talkativeness: char.extensions?.talkativeness || '0.5',
    fav: char.extensions?.fav || false,
    tags: char.tags || [],
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: char.name,
      description: char.description,
      personality: char.personality,
      scenario: char.scenario,
      first_mes: char.first_mes,
      mes_example: char.mes_example,
      creator_notes: '',
      system_prompt: char.system_prompt || '',
      post_history_instructions: char.post_history_instructions || '',
      tags: char.tags || [],
      creator: char.creator || '',
      character_version: char.character_version || '1.0',
      alternate_greetings: char.alternate_greetings || [],
      extensions: Object.assign({
        talkativeness: '0.5',
        fav: false,
        depth_prompt: { prompt: '', depth: 4, role: 'system' }
      }, char.extensions || {}),
      group_only_greetings: [],
      character_book: char.character_book || { name: '', entries: [] }
    },
    create_date: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (char.name || 'character') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImportCharacter() {
  document.getElementById('char-import-file').click();
}
