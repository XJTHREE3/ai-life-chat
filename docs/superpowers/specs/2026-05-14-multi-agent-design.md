# AI Life 多智能体架构设计

## 项目概述

AI Life 是一个微信风格手机模拟器，用户与AI角色进行聊天互动。当前系统只有单个聊天智能体（ChatAgent），本次设计引入第二个生活模拟智能体（LifeAgent），构建双智能体协作架构。

## 作业知识点覆盖

| 知识点 | 实现方式 |
|-------|---------|
| 智能体范式 | 双Agent协作：ChatAgent专注聊天，LifeAgent专注生活模拟 |
| 工具系统 | LifeAgent通过function calling调用5个正式工具 |
| 记忆机制 | 聊天→LifeAgent提取→写入世界书→下次聊天注入 |
| 通信协议 | EventBus事件总线 + 共享状态层，5种事件类型 |

## 架构设计

```
┌─────────────────────────────────────────────────┐
│                    用户界面                       │
│  (聊天页 / 朋友圈 / 备忘录 / 预设 / 世界书)       │
└──────────────┬──────────────────┬────────────────┘
               │                  │
        用户发消息            定时器/手动触发
               │                  │
               ▼                  ▼
     ┌─────────────────┐  ┌─────────────────┐
     │   ChatAgent     │  │   LifeAgent     │
     │  (qwen-plus)    │  │  (qwen-turbo)   │
     │                 │  │                 │
     │ 职责：聊天回复   │  │ 职责：          │
     │ 多消息解析       │  │  · 记忆提取     │
     │ 角色扮演         │  │  · 状态更新     │
     │                 │  │  · 朋友圈生成    │
     │                 │  │  · 主动发消息    │
     │                 │  │  · 备忘录更新    │
     └────────┬────────┘  └────────┬────────┘
              │                    │
              │   事件通知          │ 工具调用结果
              ▼                    ▼
     ┌──────────────────────────────────────┐
     │          事件总线 (EventBus)          │
     │                                      │
     │  事件类型：                            │
     │  · chat:message-sent                 │
     │  · life:memory-written               │
     │  · life:message-sent                 │
     │  · life:moment-posted                │
     │  · life:status-updated               │
     └──────────────┬───────────────────────┘
                    │
                    ▼
     ┌──────────────────────────────────────┐
     │        共享状态层 (State Layer)       │
     │  · characters[] / chatHistories[]    │
     │  · moments[] / worldBooks[]          │
     │  · localStorage (持久化)             │
     └──────────────────────────────────────┘
```

## LifeAgent 工具系统

### 工具1：write_memory

从对话中提取重要信息，写入角色的世界书作为长期记忆。

```json
{
  "name": "write_memory",
  "description": "从对话中提取重要信息，写入角色的世界书作为长期记忆",
  "parameters": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "记忆内容，如'用户明天要考试'"
      },
      "keys": {
        "type": "array",
        "items": { "type": "string" },
        "description": "触发关键词，如['考试','明天']"
      },
      "comment": {
        "type": "string",
        "description": "记忆标签，固定为'记忆'"
      }
    },
    "required": ["content", "keys"]
  }
}
```

效果：在角色的 `character_book.entries` 中新增一条，`comment` 为 "记忆"，`position` 为 "before_char"，`enabled` 为 true。

### 工具2：send_message

角色主动给用户发微信消息，仅在定时/手动模式下使用。

```json
{
  "name": "send_message",
  "description": "角色主动给用户发微信消息，仅在定时/手动模式下使用",
  "parameters": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "消息内容"
      },
      "type": {
        "type": "string",
        "enum": ["text", "photo", "transfer", "redpacket", "location"],
        "description": "消息类型，默认text"
      },
      "extra": {
        "type": "object",
        "description": "特殊消息的额外参数（如金额、描述等，可选）"
      }
    },
    "required": ["content"]
  }
}
```

效果：在 `chatHistories` 中新增一条 `role: 'char'` 的消息，UI上显示为角色主动发来的。

### 工具3：post_moment

角色发布一条朋友圈动态。

```json
{
  "name": "post_moment",
  "description": "角色发布一条朋友圈动态",
  "parameters": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "朋友圈文字内容"
      },
      "image_desc": {
        "type": "string",
        "description": "配图描述（可选）"
      }
    },
    "required": ["content"]
  }
}
```

效果：在 `moments` 数组中新增一条。

### 工具4：update_status

更新角色的心情、内心想法等状态。

```json
{
  "name": "update_status",
  "description": "更新角色的心情、内心想法等状态",
  "parameters": {
    "type": "object",
    "properties": {
      "mood": {
        "type": "string",
        "description": "心情，如'开心''烦躁'"
      },
      "mood_desc": {
        "type": "string",
        "description": "心情描述"
      },
      "inner_thought": {
        "type": "string",
        "description": "内心想法"
      }
    },
    "required": ["mood", "mood_desc", "inner_thought"]
  }
}
```

效果：修改角色的 `mood`、`moodDesc`、`innerThought` 字段。

### 工具5：update_schedule

推进日程，将当前事件标记为完成，开始下一个事件。

```json
{
  "name": "update_schedule",
  "description": "推进日程，将当前事件标记为完成，开始下一个事件",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["advance", "modify"],
        "description": "advance=推进到下一个事件，modify=修改当前事件描述"
      },
      "new_desc": {
        "type": "string",
        "description": "新的事件描述（仅modify时使用）"
      }
    },
    "required": ["action"]
  }
}
```

效果：推进 `todaySchedule` 的状态，更新角色的 status/location/wallet。

## 通信协议

### EventBus 实现

```javascript
const EventBus = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  },
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
};
```

### 事件定义

| 事件名 | 发出方 | 接收方 | 数据 | 用途 |
|-------|-------|-------|------|------|
| `chat:message-sent` | ChatAgent | LifeAgent | `{charIndex, userMsg, charReply}` | 通知LifeAgent提取记忆 |
| `life:memory-written` | LifeAgent | ChatAgent(下次调用时) | `{charIndex, entry}` | 记忆已写入，下次聊天自动加载 |
| `life:message-sent` | LifeAgent | UI | `{charIndex, message}` | 主动消息，UI渲染新消息 |
| `life:moment-posted` | LifeAgent | UI | `{moment}` | 朋友圈已发，UI刷新 |
| `life:status-updated` | LifeAgent | UI | `{charIndex, mood, ...}` | 状态更新，UI刷新 |

## 记忆机制

### 提取流程

1. 用户发消息 → ChatAgent回复 → 发出 `chat:message-sent` 事件
2. LifeAgent收到事件，输入：用户消息、角色回复、已有记忆列表
3. LifeAgent调用 `write_memory` 工具，提取重要信息
4. 写入角色的 `character_book.entries`，`comment` 标记为 "记忆"
5. 下次用户聊天时，ChatAgent的 `callApi()` 中世界书匹配到关键词，记忆被注入system prompt

### 去重策略

- LifeAgent提取前收到已有记忆列表（`comment === '记忆'` 的条目）
- Prompt要求不重复写入已有记忆
- 信息更新时覆盖旧记忆

### 容量控制

- 每个角色最多保留20条记忆条目
- 超出时LifeAgent可选择删除最旧条目或合并相关记忆
- 用户可在世界书页面手动编辑/删除记忆条目

## 触发模式

| 模式 | 触发时机 | 执行内容 | 主动发消息 |
|-----|---------|---------|-----------|
| 实时模式 | 每次用户发消息后 | 记忆提取 + 状态更新 | 否 |
| 定时模式 | 每30分钟 | 记忆提取 + 状态更新 + 朋友圈 + 主动消息 | 是 |
| 手动模式 | 用户点击按钮 | 全部功能 | 是 |

### 主动消息频率控制

- 定时模式：每30分钟最多1条主动消息
- 手动模式：每次手动触发最多1条
- 主动消息概率：约30%（随机决定是否发送）
- 主动消息内容：LifeAgent根据当前状态和记忆决定

## 模型配置

- ChatAgent：使用现有API配置（较贵模型，如qwen-plus）
- LifeAgent：独立API配置（便宜轻量模型，如qwen-turbo）
- 配置入口：右下角红色快捷键面板内
- 配置项：API地址、API Key、模型名
- 保存到localStorage：`ai-life-life-agent-config`

## LifeAgent System Prompt

```
你是一个生活模拟助手，负责管理角色的日常生活状态。

【角色信息】
名字：{name}
当前心情：{mood}（{moodDesc}）
内心想法：{innerThought}
钱包余额：¥{wallet}
当前日程：{schedule}

【最近对话】
{recentChat}

【已有记忆】
{existingMemories}

【当前模式】
{mode}（实时/定时/手动）

【任务】
根据以上信息，你可以调用工具来：
1. 提取对话中的重要信息写入记忆
2. 更新角色的心情和想法
3. 推进日程
4. 发布朋友圈
5. 主动给用户发消息（仅在定时/手动模式下）

注意：
- 记忆只提取真正重要的信息（约定、喜好、关系变化、重要事件）
- 不要重复写入已有记忆
- 主动发消息要自然，频率要低，像真人在微信上主动找你聊天
- 主动发消息时，要表现出是角色自己主动开启话题
- 朋友圈内容要符合角色当前状态
- 如果没有需要提取的记忆或更新的状态，可以不调用任何工具
```

## 新增文件结构

```
js/
  agent/
    event-bus.js      ← 事件总线
    life-agent.js     ← LifeAgent（工具定义 + API调用 + 结果处理）
    tools.js          ← 工具执行函数（write_memory, send_message等）
  chat.js             ← 现有，添加事件通知
  main.js             ← 现有，添加定时器逻辑
  state.js            ← 现有，添加轻量模型API配置
```

## 数据流示例

### 场景1：用户聊天后自动提取记忆

1. 用户发送："我明天要考试，好紧张啊"
2. ChatAgent回复："加油加油！你一定可以的💪"
3. 发出 `chat:message-sent` 事件
4. LifeAgent收到事件，分析对话
5. LifeAgent调用 `write_memory({content: "用户明天有考试，感到紧张", keys: ["考试", "明天", "紧张"]})`
6. 记忆写入角色世界书
7. 下次聊天时，ChatAgent自动加载该记忆

### 场景2：定时模式下的主动消息

1. 30分钟定时器触发
2. LifeAgent分析角色当前状态（正在工作，心情专注）
3. LifeAgent调用 `update_status({mood: "疲惫", mood_desc: "工作了一下午有点累", inner_thought: "好想下班..."})`
4. LifeAgent决定主动发消息（30%概率命中）
5. LifeAgent调用 `send_message({content: "工作好累啊...你下班了吗？"})`
6. UI显示角色主动发来的消息

### 场景3：手动触发全面更新

1. 用户点击"手动更新"按钮
2. LifeAgent分析所有角色状态和最近对话
3. LifeAgent调用多个工具：更新状态、推进日程、发朋友圈、主动消息
4. 所有变更通过事件通知UI刷新
