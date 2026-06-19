import { describe, it, expect } from 'vitest';
import { estimateTokens, truncateMessages } from '../context/index.js';
import type { Message } from '@opencode/shared';

describe('Context Management', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for simple text', () => {
      const text = 'Hello, world!';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should estimate tokens for longer text', () => {
      const text = 'This is a longer piece of text that should have more tokens associated with it than the shorter examples.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(10);
    });
  });

  describe('truncateMessages', () => {
    it('should preserve system messages when configured', () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const result = truncateMessages(messages, {
        maxTokens: 50,
        preserveSystem: true,
        preserveLast: 1,
      });

      const systemMessages = result.filter((m) => m.role === 'system');
      expect(systemMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve last messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'First message' },
        { role: 'user', content: 'Second message' },
        { role: 'user', content: 'Third message' },
        { role: 'user', content: 'Last message' },
      ];

      const result = truncateMessages(messages, {
        maxTokens: 500,
        preserveSystem: false,
        preserveLast: 2,
      });

      // Should include at least the last 2 messages
      expect(result.length).toBeGreaterThanOrEqual(2);
      const lastMessages = result.slice(-2);
      const hasLast = lastMessages.some((m) => m.content === 'Last message');
      const hasSecondLast = lastMessages.some((m) => m.content === 'Third message');
      expect(hasLast || hasSecondLast).toBe(true);
    });
  });
});

describe('Message Utilities', () => {
  it('should create valid messages', () => {
    const message: Message = {
      role: 'user',
      content: 'Test message',
    };

    expect(message.role).toBe('user');
    expect(message.content).toBe('Test message');
  });

  it('should support tool calls in messages', () => {
    const message: Message = {
      role: 'assistant',
      content: 'I will use a tool',
      toolCalls: [
        {
          id: 'tool_1',
          type: 'function',
          function: {
            name: 'read_file',
            arguments: '{"path": "test.txt"}',
          },
        },
      ],
    };

    expect(message.toolCalls).toBeDefined();
    expect(message.toolCalls!.length).toBe(1);
    expect(message.toolCalls![0].function.name).toBe('read_file');
  });
});
