const LifeAgentTools = [
  {
    type: 'function',
    function: {
      name: 'write_memory',
      description: '从对话中提取重要信息，写入角色的世界书作为长期记忆',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '记忆内容，如"用户明天要考试"'
          },
          keys: {
            type: 'array',
            items: { type: 'string' },
            description: '触发关键词，如["考试","明天"]'
          },
          comment: {
            type: 'string',
            description: '记忆标签，固定为"记忆"'
          }
        },
        required: ['content', 'keys']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_message',
      description: '角色主动给用户发微信消息，仅在定时/手动模式下使用',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '消息内容'
          },
          type: {
            type: 'string',
            enum: ['text', 'photo', 'transfer', 'redpacket', 'location'],
            description: '消息类型，默认text'
          },
          extra: {
            type: 'object',
            description: '特殊消息的额外参数（如金额、描述等，可选）'
          }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'post_moment',
      description: '角色发布一条朋友圈动态',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '朋友圈文字内容'
          },
          image_desc: {
            type: 'string',
            description: '配图描述（可选）'
          }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_status',
      description: '更新角色的心情、内心想法等状态',
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            description: '心情，如"开心""烦躁"'
          },
          mood_desc: {
            type: 'string',
            description: '心情描述'
          },
          inner_thought: {
            type: 'string',
            description: '内心想法'
          }
        },
        required: ['mood', 'mood_desc', 'inner_thought']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_schedule',
      description: '推进日程，将当前事件标记为完成，开始下一个事件',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['advance', 'modify'],
            description: 'advance=推进到下一个事件，modify=修改当前事件描述'
          },
          new_desc: {
            type: 'string',
            description: '新的事件描述（仅modify时使用）'
          }
        },
        required: ['action']
      }
    }
  }
];

const LifeAgent = {
  async process(charIndex, triggerMode) {
    const char = characters[charIndex];
    if (!char) return { success: false, error: '角色不存在' };

    if (!lifeAgentConfig.url || !lifeAgentConfig.apiKey) {
      return { success: false, error: 'LifeAgent API未配置' };
    }

    const mode = triggerMode || lifeAgentMode;
    const history = chatHistories[charIndex];
    const recentHistory = history.slice(-10);
    const charBook = char.character_book;
    const memoryEntries = (charBook && charBook.entries)
      ? charBook.entries.filter(e => e.comment === '记忆')
      : [];

    const recentChat = recentHistory.map(msg => {
      const prefix = msg.role === 'user' ? userState.name : char.name;
      return prefix + '：' + msg.content;
    }).join('\n');

    const existingMemories = memoryEntries.map(e => '- ' + e.content).join('\n') || '暂无记忆';

    const currentEvent = char.todaySchedule.find(s => s.status === 'current');
    const scheduleStr = currentEvent
      ? currentEvent.event + '（' + currentEvent.location + '）'
      : '无当前日程';

    const modeLabel = mode === 'realtime' ? '实时' : mode === 'timed' ? '定时' : '手动';

    const sortedPrompts = (lifeAgentPrompts || [])
      .filter(p => p.enabled)
      .sort((a, b) => a.injection_order - b.injection_order);

    const replaceVars = (text) => {
      return text
        .replace(/\{\{name\}\}/g, char.name)
        .replace(/\{\{mood\}\}/g, char.mood)
        .replace(/\{\{moodDesc\}\}/g, char.moodDesc)
        .replace(/\{\{innerThought\}\}/g, char.innerThought)
        .replace(/\{\{wallet\}\}/g, char.wallet.toFixed(2))
        .replace(/\{\{schedule\}\}/g, scheduleStr)
        .replace(/\{\{recentChat\}\}/g, recentChat || '暂无对话')
        .replace(/\{\{existingMemories\}\}/g, existingMemories)
        .replace(/\{\{mode\}\}/g, modeLabel);
    };

    const systemPrompt = sortedPrompts.map(p => replaceVars(p.content)).join('\n\n');

    const messages = [{ role: 'system', content: systemPrompt }];

    if (mode === 'timed') {
      messages.push({
        role: 'user',
        content: '请根据当前状态，决定是否需要更新角色状态、发朋友圈或主动给用户发消息。'
      });
    } else if (mode === 'manual') {
      messages.push({
        role: 'user',
        content: '请根据当前状态，决定是否需要更新角色状态或发朋友圈。不要主动发消息。'
      });
    } else {
      const lastUserMsg = [...recentHistory].reverse().find(m => m.role === 'user');
      const lastCharMsg = [...recentHistory].reverse().find(m => m.role === 'char');
      let userContent = '请分析最近的对话，提取需要记忆的重要信息，并更新角色状态。';
      if (lastUserMsg) userContent += '\n用户最近说：' + lastUserMsg.content;
      if (lastCharMsg) userContent += '\n角色回复：' + lastCharMsg.content;
      messages.push({ role: 'user', content: userContent });
    }

    try {
      const baseUrl = lifeAgentConfig.url.replace(/\/+$/, '');
      const response = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + lifeAgentConfig.apiKey
        },
        body: JSON.stringify({
          model: lifeAgentConfig.model || 'qwen-turbo',
          messages: messages,
          tools: LifeAgentTools,
          temperature: 0.5,
          max_tokens: 512
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error?.message || response.status + ' ' + response.statusText };
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) return { success: false, error: 'API返回空响应' };

      const toolCalls = choice.message?.tool_calls;
      const textContent = choice.message?.content?.trim();
      const results = [];

      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const fnName = toolCall.function.name;
          let fnParams;
          try {
            fnParams = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            results.push({ tool: fnName, success: false, error: '参数解析失败' });
            continue;
          }

          let result;
          switch (fnName) {
            case 'write_memory':
              executeWriteMemory(fnParams, charIndex);
              result = { tool: fnName, success: true, params: fnParams };
              break;
            case 'send_message':
              if (mode === 'realtime' || mode === 'manual') {
                result = { tool: fnName, success: false, error: '当前模式下不允许主动发消息' };
              } else {
                executeSendMessage(fnParams, charIndex);
                result = { tool: fnName, success: true, params: fnParams };
              }
              break;
            case 'post_moment':
              executePostMoment(fnParams, charIndex);
              result = { tool: fnName, success: true, params: fnParams };
              break;
            case 'update_status':
              executeUpdateStatus(fnParams, charIndex);
              result = { tool: fnName, success: true, params: fnParams };
              break;
            case 'update_schedule':
              executeUpdateSchedule(fnParams, charIndex);
              result = { tool: fnName, success: true, params: fnParams };
              break;
            default:
              result = { tool: fnName, success: false, error: '未知工具' };
          }
          results.push(result);
        }
      }

      return {
        success: true,
        toolResults: results,
        textContent: textContent || null
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};
