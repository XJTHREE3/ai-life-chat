const userState = {
  name: '用户',
  realName: '',
  signature: '',
  wallet: 0.00,
  desc: '',
  personaDescription: '',
  avatarImage: null,
  coverImage: null
};

let characters = [
  {
    name: '小艾',
    description: '小艾是一个活泼开朗的女孩，喜欢喝拿铁咖啡，尤其是冰拿铁。她常去的咖啡厅叫"慢时光"，是她和朋友经常聚会的场所。',
    personality: '活泼、开朗、爱聊天',
    scenario: '',
    first_mes: '早上好呀！我刚跑完步，感觉神清气爽~',
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
      name: '小艾的世界',
      entries: [
        {
          id: 0,
          keys: ['咖啡', '拿铁'],
          secondary_keys: [],
          comment: '小艾的咖啡偏好',
          content: '小艾喜欢喝拿铁咖啡，尤其是冰拿铁。她常去的咖啡厅叫"慢时光"，是她和朋友经常聚会的场所。',
          constant: false,
          selective: true,
          insertion_order: 100,
          enabled: true,
          position: 'after_char',
          use_regex: true,
          extensions: {}
        }
      ]
    },
    avatar: '艾',
    avatarImage: null,
    status: 'online',
    location: '咖啡厅',
    wallet: 128.00,
    mood: '平静',
    moodDesc: '刚起床，还不太清醒',
    innerThought: '今天天气不错，不知道待会儿会不会有什么有趣的事...',
    hasPostedToday: false,
    lastPostDate: '',
    todaySchedule: [
      { time: '08:00', event: '晨跑', location: '公园', status: 'done', cost: 0, desc: '早起跑步锻炼身体' },
      { time: '09:30', event: '吃早餐', location: '家', status: 'done', cost: 15, desc: '简单的早餐' },
      { time: '10:30', event: '工作', location: '咖啡厅', status: 'current', cost: -50, desc: '在咖啡厅处理工作' },
      { time: '12:30', event: '午餐', location: '餐厅', status: 'pending', cost: 35, desc: '和朋友一起吃午饭' },
      { time: '14:00', event: '购物', location: '商场', status: 'pending', cost: 200, desc: '买一些日用品' },
      { time: '16:00', event: '看电影', location: '电影院', status: 'pending', cost: 60, desc: '看新上映的科幻片' },
      { time: '19:00', event: '晚餐', location: '家', status: 'pending', cost: 0, desc: '在家做饭' },
      { time: '21:00', event: '打游戏', location: '家', status: 'pending', cost: 0, desc: '玩几局游戏放松' },
      { time: '23:00', event: '睡觉', location: '家', status: 'pending', cost: 0, desc: '晚安' }
    ]
  },
  {
    name: '小月',
    description: '小月是大学生，喜欢在图书馆看书。她最近在看一本关于心理学的书，觉得非常有趣。她的专业是中文系。',
    personality: '安静、内向、爱读书',
    scenario: '',
    first_mes: '嗯...这本书好有趣~',
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
      name: '小月的世界',
      entries: [
        {
          id: 0,
          keys: ['图书馆', '看书', '书'],
          secondary_keys: [],
          comment: '小月的阅读习惯',
          content: '小月是大学生，喜欢在图书馆看书。她最近在看一本关于心理学的书，觉得非常有趣。她的专业是中文系。',
          constant: false,
          selective: true,
          insertion_order: 100,
          enabled: true,
          position: 'after_char',
          use_regex: true,
          extensions: {}
        }
      ]
    },
    avatar: '月',
    avatarImage: null,
    status: 'online',
    location: '图书馆',
    wallet: 56.00,
    mood: '安静',
    moodDesc: '在图书馆看书',
    innerThought: '这本书好有趣，不知不觉就看了一下午...',
    hasPostedToday: false,
    lastPostDate: '',
    todaySchedule: [
      { time: '08:30', event: '吃早餐', location: '宿舍', status: 'done', cost: 10, desc: '简单的早餐' },
      { time: '09:30', event: '上课', location: '教学楼', status: 'done', cost: 0, desc: '上午的课' },
      { time: '12:00', event: '午餐', location: '食堂', status: 'current', cost: 12, desc: '食堂吃饭' },
      { time: '14:00', event: '看书', location: '图书馆', status: 'pending', cost: 0, desc: '在图书馆看书学习' },
      { time: '17:00', event: '运动', location: '操场', status: 'pending', cost: 0, desc: '傍晚跑步' },
      { time: '19:00', event: '晚餐', location: '食堂', status: 'pending', cost: 15, desc: '食堂晚餐' },
      { time: '20:00', event: '追剧', location: '宿舍', status: 'pending', cost: 0, desc: '看新出的韩剧' },
      { time: '23:30', event: '睡觉', location: '宿舍', status: 'pending', cost: 0, desc: '晚安' }
    ]
  }
];
let currentCharIndex = 0;

let chatHistories = [
  [
    { role: 'char', content: '早上好呀！我刚跑完步，感觉神清气爽~', time: '08:15', read: true },
    { role: 'char', content: '现在在咖啡厅工作，有什么事吗？', time: '10:45', read: true }
  ],
  [
    { role: 'char', content: '嗯...这本书好有趣~', time: '09:00', read: true },
    { role: 'char', content: '在图书馆看书呢，怎么了？', time: '12:30', read: true }
  ]
];

let moments = [
  {
    id: Date.now() - 3600000,
    author: 'char-0',
    content: '在咖啡厅写代码，拿铁续命中☕',
    imageDesc: '咖啡厅的工作台',
    time: Date.now() - 3600000,
    likes: ['user'],
    comments: []
  }
];

const moodMap = {
  '晨跑': { mood: '精神', moodDesc: '运动后神清气爽', innerThought: '跑步的时候风很舒服，感觉一天都充满活力...' },
  '吃早餐': { mood: '满足', moodDesc: '吃饱了心情好', innerThought: '简单的早餐也很幸福...' },
  '工作': { mood: '专注', moodDesc: '认真工作中', innerThought: '代码写到一半，思路还算清晰...不过有点想摸鱼' },
  '午餐': { mood: '开心', moodDesc: '和朋友吃饭很开心', innerThought: '好久没和朋友聚了，今天聊了好多...' },
  '购物': { mood: '兴奋', moodDesc: '逛街买买买', innerThought: '看到好多想买的东西，钱包在哭泣...' },
  '看电影': { mood: '放松', moodDesc: '看电影真享受', innerThought: '这部片子比预期好看多了...' },
  '晚餐': { mood: '温馨', moodDesc: '在家做饭很温馨', innerThought: '自己做的饭虽然一般，但很有成就感...' },
  '打游戏': { mood: '开心', moodDesc: '游戏时间到', innerThought: '今天一定要赢一局！昨天连跪太惨了...' },
  '睡觉': { mood: '困倦', moodDesc: '困了想睡觉', innerThought: '今天过得还不错...晚安...' },
  '上课': { mood: '无聊', moodDesc: '上课中', innerThought: '这课好无聊啊...什么时候下课...' },
  '看书': { mood: '沉浸', moodDesc: '在图书馆看书', innerThought: '这本书太好看了，不知不觉就看了一下午...' },
  '运动': { mood: '舒畅', moodDesc: '运动后很舒服', innerThought: '傍晚跑步真的很舒服，出了一身汗...' },
  '追剧': { mood: '入迷', moodDesc: '追剧中', innerThought: '新出的韩剧太好看了！根本停不下来...' }
};

let currentEditType = '';
let currentFuncType = '';

let presets = [
  {
    name: '默认',
    systemPrompt: '你是一个模拟手机聊天应用的AI角色。你会根据角色的设定、当前心情和日程来回复用户的消息。请保持角色的一致性，用自然、口语化的方式回复。回复要简短，像微信聊天一样，通常1-3句话。不要使用markdown格式。',
    prompts: [
      { identifier: 'main', name: '主提示词', role: 'system', content: '你是一个模拟手机聊天应用的AI角色。你会根据角色的设定、当前心情和日程来回复用户的消息。请保持角色的一致性，用自然、口语化的方式回复。回复要简短，像微信聊天一样，通常1-3句话。不要使用markdown格式。', enabled: true, injection_order: 0, marker: false },
      { identifier: 'worldInfoBefore', name: '🔨世界书Ⅰ(before)', role: 'system', content: '', enabled: true, injection_order: 10, marker: true },
      { identifier: 'charDescription', name: '🔨角色描述', role: 'system', content: '', enabled: true, injection_order: 20, marker: true },
      { identifier: 'charPersonality', name: '🔨角色人格', role: 'system', content: '', enabled: true, injection_order: 30, marker: true },
      { identifier: 'scenario', name: '🔨情景设定', role: 'system', content: '', enabled: true, injection_order: 40, marker: true },
      { identifier: 'personaDescription', name: '🔨用户设定', role: 'system', content: '', enabled: true, injection_order: 50, marker: true },
      { identifier: 'worldInfoAfter', name: '🔨世界书Ⅱ(after)', role: 'system', content: '', enabled: true, injection_order: 60, marker: true },
      { identifier: 'chatHistory', name: '聊天历史', role: 'system', content: '', enabled: true, injection_order: 70, marker: true },
      { identifier: 'dialogueExamples', name: '对话示例', role: 'system', content: '', enabled: true, injection_order: 80, marker: true }
    ],
    parameters: {
      temperature: 0.7,
      maxTokens: 256,
      topP: 0.9
    },
    wiFormat: '{0}',
    scenarioFormat: '[Circumstances: {{scenario}}]',
    personalityFormat: '[{{char}}\'s personality: {{personality}}]',
    worldBookEnabled: true
  }
];
let currentPresetIndex = 0;

let apiConfig = {
  url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: '',
  model: 'qwen-plus'
};

let worldBooks = [
  {
    id: 0,
    name: '默认世界',
    entries: [
      {
        id: Date.now(),
        keys: ['咖啡', '拿铁'],
        secondary_keys: [],
        selectiveLogic: 0,
        content: '小艾喜欢喝拿铁咖啡，尤其是冰拿铁。她常去的咖啡厅叫"慢时光"，是她和朋友经常聚会的场所。',
        comment: '小艾的咖啡偏好',
        insertion_order: 100,
        enabled: true,
        constant: false,
        position: 'after_char',
        use_regex: true,
        extensions: {}
      },
      {
        id: Date.now() + 1,
        keys: ['图书馆', '看书', '书'],
        secondaryKeys: ['小月'],
        selectiveLogic: 0,
        content: '小月是大学生，喜欢在图书馆看书。她最近在看一本关于心理学的书，觉得非常有趣。她的专业是中文系。',
        comment: '小月的阅读习惯',
        insertion_order: 90,
        enabled: true,
        constant: false,
        position: 'after_char',
        use_regex: true,
        extensions: {}
      }
    ]
  }
];
let currentWorldBookIndex = 0;
let lifeAgentConfig = {
  url: '',
  apiKey: '',
  model: 'qwen-turbo'
};
let lifeAgentMode = 'realtime';
let lifeAgentPrompts = [
  {
    identifier: 'agent-system',
    name: '系统指令',
    role: 'system',
    content: '你是一个生活模拟助手，负责管理角色的日常生活状态。',
    enabled: true,
    injection_order: 0,
    marker: false
  },
  {
    identifier: 'agent-role-info',
    name: '角色信息',
    role: 'system',
    content: '【角色信息】\n名字：{{name}}\n当前心情：{{mood}}（{{moodDesc}}）\n内心想法：{{innerThought}}\n钱包余额：¥{{wallet}}\n当前日程：{{schedule}}',
    enabled: true,
    injection_order: 50,
    marker: true
  },
  {
    identifier: 'agent-context',
    name: '上下文',
    role: 'system',
    content: '【最近对话】\n{{recentChat}}\n\n【已有记忆】\n{{existingMemories}}\n\n【当前模式】\n{{mode}}',
    enabled: true,
    injection_order: 100,
    marker: true
  },
  {
    identifier: 'agent-task',
    name: '任务指令',
    role: 'system',
    content: '【任务】\n根据以上信息，你可以调用工具来：\n1. 提取对话中的重要信息写入记忆\n2. 更新角色的心情和想法\n3. 推进日程\n4. 发布朋友圈\n5. 主动给用户发消息（仅在定时模式下）\n\n注意：\n- 记忆只提取真正重要的信息（约定、喜好、关系变化、重要事件）\n- 不要重复写入已有记忆\n- 主动发消息要自然，频率要低，像真人在微信上主动找你聊天\n- 主动发消息时，要表现出是角色自己主动开启话题\n- 朋友圈内容要符合角色当前状态\n- 如果没有需要提取的记忆或更新的状态，可以不调用任何工具',
    enabled: true,
    injection_order: 150,
    marker: false
  }
];
