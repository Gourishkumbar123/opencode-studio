// ============================================================================
// OpenCode Studio - LLM Provider Abstraction
// ============================================================================

import type {
  ProviderConfig,
  CompletionOptions,
  EmbeddingOptions,
  Message,
  Tool,
} from '@opencode/shared';

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  toolCall?: {
    id: string;
    name: string;
    arguments: string;
  };
}

// ----------------------------------------------------------------------------
// Base Provider Interface
// ----------------------------------------------------------------------------

export abstract class BaseLLMProvider {
  protected config: ProviderConfig;
  
  constructor(config: ProviderConfig) {
    this.config = config;
  }
  
  abstract complete(options: CompletionOptions): Promise<LLMResponse>;
  abstract stream(options: CompletionOptions): AsyncGenerator<StreamChunk>;
  abstract embed(text: string, options?: EmbeddingOptions): Promise<number[]>;
  abstract listModels(): Promise<string[]>;
  
  getModel(): string {
    return this.config.model || 'anthropic/claude-3.5-sonnet';
  }
}

// ----------------------------------------------------------------------------
// OpenRouter Provider
// ----------------------------------------------------------------------------

export class OpenRouterProvider extends BaseLLMProvider {
  private baseUrl = 'https://openrouter.ai/api/v1';
  
  async complete(options: CompletionOptions): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://opencode.studio',
        'X-Title': 'OpenCode Studio',
      },
      body: JSON.stringify({
        model: options.model || this.config.model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
        tools: options.tools ? this.formatTools(options.tools) : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://opencode.studio',
        'X-Title': 'OpenCode Studio',
      },
      body: JSON.stringify({
        model: options.model || this.config.model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
        tools: options.tools ? this.formatTools(options.tools) : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');
    
    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCall: StreamChunk['toolCall'] | undefined;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') {
          yield { content: '', done: true };
          continue;
        }
        
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = this.parseStreamChunk(data);
          
          if (chunk) {
            if (chunk.toolCall) {
              if (currentToolCall && chunk.toolCall.name === currentToolCall.name) {
                currentToolCall.arguments += chunk.toolCall.arguments;
              } else {
                if (currentToolCall) {
                  yield {
                    content: '',
                    done: false,
                    toolCall: { ...currentToolCall, arguments: currentToolCall.arguments },
                  };
                }
                currentToolCall = chunk.toolCall;
              }
            } else if (chunk.content) {
              if (currentToolCall) {
                yield {
                  content: '',
                  done: false,
                  toolCall: { ...currentToolCall, arguments: currentToolCall.arguments },
                };
                currentToolCall = undefined;
              }
              yield chunk;
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    
    if (currentToolCall) {
      yield {
        content: '',
        done: true,
        toolCall: { ...currentToolCall, arguments: currentToolCall.arguments },
      };
    }
    
    yield { content: '', done: true };
  }
  
  async embed(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const model = options?.model || this.config.embeddingModel || 'openai/text-embedding-ada-002';
    
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.map((m: { id: string }) => m.id);
  }
  
  private formatTools(tools: Tool[]): object[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
  
  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const choice = data.choices?.[0] as Record<string, unknown>;
    const message = choice?.message as Record<string, unknown> || {};
    
    const toolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined;
    
    return {
      content: (message.content as string) || '',
      toolCalls: toolCalls?.map((tc) => {
        const fn = tc.function as Record<string, unknown>;
        return {
          id: tc.id as string,
          name: fn.name as string,
          arguments: JSON.parse(fn.arguments as string),
        };
      }),
      usage: data.usage as LLMResponse['usage'],
      finishReason: choice.finish_reason as string,
    };
  }
  
  private parseStreamChunk(data: Record<string, unknown>): StreamChunk | null {
    const delta = data.choices?.[0]?.delta as Record<string, unknown>;
    if (!delta) return null;
    
    if (delta.tool_calls) {
      const toolCall = (delta.tool_calls as Array<Record<string, unknown>>)[0];
      if (toolCall) {
        const fn = toolCall.function as Record<string, unknown>;
        return {
          content: '',
          done: false,
          toolCall: {
            id: toolCall.id as string,
            name: fn.name as string,
            arguments: fn.arguments as string || '',
          },
        };
      }
    }
    
    return {
      content: (delta.content as string) || '',
      done: false,
    };
  }
}

// ----------------------------------------------------------------------------
// Anthropic Provider
// ----------------------------------------------------------------------------

export class AnthropicProvider extends BaseLLMProvider {
  private baseUrl = 'https://api.anthropic.com/v1';
  
  async complete(options: CompletionOptions): Promise<LLMResponse> {
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const nonSystemMessages = options.messages.filter((m) => m.role !== 'system');
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: options.model || this.config.model || 'claude-3-5-sonnet-20241022',
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        tools: options.tools ? this.formatTools(options.tools) : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const nonSystemMessages = options.messages.filter((m) => m.role !== 'system');
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: options.model || this.config.model || 'claude-3-5-sonnet-20241022',
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
        tools: options.tools ? this.formatTools(options.tools) : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') {
          yield { content: '', done: true };
          continue;
        }
        
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = this.parseStreamChunk(data);
          if (chunk) yield chunk;
        } catch {
          // Skip malformed JSON
        }
      }
    }
    
    yield { content: '', done: true };
  }
  
  async embed(text: string, _options?: EmbeddingOptions): Promise<number[]> {
    // Anthropic doesn't have embeddings, use OpenRouter for that
    throw new Error('Anthropic does not support embeddings. Use OpenRouter or another provider.');
  }
  
  async listModels(): Promise<string[]> {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];
  }
  
  private formatTools(tools: Tool[]): object[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }
  
  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const content = data.content as Array<Record<string, unknown>> || [];
    
    let text = '';
    const toolCalls: LLMResponse['toolCalls'] = [];
    
    for (const block of content) {
      if (block.type === 'text') {
        text += block.text as string;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id as string,
          name: block.name as string,
          arguments: JSON.parse(block.input as string),
        });
      }
    }
    
    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.usage?.input_tokens as number || 0,
        completionTokens: data.usage?.output_tokens as number || 0,
        totalTokens: (data.usage?.input_tokens as number || 0) + (data.usage?.output_tokens as number || 0),
      },
      finishReason: data.stop_reason as string,
    };
  }
  
  private parseStreamChunk(data: Record<string, unknown>): StreamChunk | null {
    const type = data.type as string;
    
    if (type === 'content_block_start') {
      return null;
    }
    
    if (type === 'content_block_delta') {
      const delta = data.delta as Record<string, unknown>;
      if (delta.type === 'text_delta') {
        return {
          content: delta.text as string || '',
          done: false,
        };
      }
      if (delta.type === 'input_json_delta') {
        return {
          content: '',
          done: false,
          toolCall: {
            id: data.index + '_' + Date.now(),
            name: '',
            arguments: delta.partial_json as string || '',
          },
        };
      }
    }
    
    if (type === 'message_delta') {
      return { content: '', done: true };
    }
    
    return null;
  }
}

// ----------------------------------------------------------------------------
// OpenAI Provider
// ----------------------------------------------------------------------------

export class OpenAIProvider extends BaseLLMProvider {
  private baseUrl: string;
  
  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }
  
  async complete(options: CompletionOptions): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.config.model || 'gpt-4-turbo',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        tools: options.tools ? this.formatTools(options.tools) : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.config.model || 'gpt-4-turbo',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
        tools: options.tools ? this.formatTools(options.tools) : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') {
          yield { content: '', done: true };
          continue;
        }
        
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = this.parseStreamChunk(data);
          if (chunk) yield chunk;
        } catch {
          // Skip malformed JSON
        }
      }
    }
    
    yield { content: '', done: true };
  }
  
  async embed(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const model = options?.model || 'text-embedding-ada-002';
    
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.map((m: { id: string }) => m.id);
  }
  
  private formatTools(tools: Tool[]): object[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
  
  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const choice = data.choices?.[0] as Record<string, unknown>;
    const message = choice?.message as Record<string, unknown> || {};
    
    const toolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined;
    
    return {
      content: (message.content as string) || '',
      toolCalls: toolCalls?.map((tc) => {
        const fn = tc.function as Record<string, unknown>;
        return {
          id: tc.id as string,
          name: fn.name as string,
          arguments: JSON.parse(fn.arguments as string),
        };
      }),
      usage: data.usage as LLMResponse['usage'],
      finishReason: choice.finish_reason as string,
    };
  }
  
  private parseStreamChunk(data: Record<string, unknown>): StreamChunk | null {
    const delta = data.choices?.[0]?.delta as Record<string, unknown>;
    if (!delta) return null;
    
    if (delta.tool_calls) {
      const toolCall = (delta.tool_calls as Array<Record<string, unknown>>)[0];
      if (toolCall) {
        const fn = toolCall.function as Record<string, unknown>;
        return {
          content: '',
          done: false,
          toolCall: {
            id: toolCall.id as string,
            name: fn.name as string,
            arguments: fn.arguments as string || '',
          },
        };
      }
    }
    
    return {
      content: (delta.content as string) || '',
      done: false,
    };
  }
}

// ----------------------------------------------------------------------------
// Google Gemini Provider
// ----------------------------------------------------------------------------

export class GeminiProvider extends BaseLLMProvider {
  private baseUrl: string;
  
  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }
  
  async complete(options: CompletionOptions): Promise<LLMResponse> {
    const model = options.model || this.config.model || 'gemini-1.5-pro';
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: this.formatMessages(options.messages),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
        tools: options.tools ? { function_declarations: this.formatTools(options.tools) } : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const model = options.model || this.config.model || 'gemini-1.5-pro';
    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: this.formatMessages(options.messages),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = this.parseStreamChunk(data);
          if (chunk) yield chunk;
        } catch {
          // Skip malformed JSON
        }
      }
    }
    
    yield { content: '', done: true };
  }
  
  async embed(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const model = options?.model || 'embedding-001';
    const url = `${this.baseUrl}/models/${model}:embedContent?key=${this.config.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini embedding error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return data.embedding.values;
  }
  
  async listModels(): Promise<string[]> {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
    ];
  }
  
  private formatMessages(messages: Message[]): object[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }
  
  private formatTools(tools: Tool[]): object[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }
  
  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const candidates = data.candidates as Array<Record<string, unknown>> || [];
    const content = candidates[0]?.content as Record<string, unknown>;
    const parts = content?.parts as Array<Record<string, unknown>> || [];
    
    let text = '';
    const toolCalls: LLMResponse['toolCalls'] = [];
    
    for (const part of parts) {
      if (part.text) {
        text += part.text;
      } else if (part.functionCall) {
        const fc = part.functionCall as Record<string, unknown>;
        toolCalls.push({
          id: `call_${Date.now()}`,
          name: fc.name as string,
          arguments: fc.args as Record<string, unknown>,
        });
      }
    }
    
    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: candidates[0]?.finishReason as string,
    };
  }
  
  private parseStreamChunk(data: Record<string, unknown>): StreamChunk | null {
    const candidates = data.candidates as Array<Record<string, unknown>> || [];
    const content = candidates[0]?.content as Record<string, unknown>;
    const parts = content?.parts as Array<Record<string, unknown>> || [];
    
    const part = parts[0];
    if (part?.text) {
      return {
        content: part.text as string,
        done: false,
      };
    }
    
    return null;
  }
}

// ----------------------------------------------------------------------------
// Provider Factory
// ----------------------------------------------------------------------------

export function createProvider(config: ProviderConfig): BaseLLMProvider {
  switch (config.name) {
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'google':
      return new GeminiProvider(config);
    case 'deepseek':
      return new OpenAIProvider({ ...config, baseUrl: 'https://api.deepseek.com/v1' });
    case 'mistral':
      return new OpenAIProvider({ ...config, baseUrl: 'https://api.mistral.ai/v1' });
    case 'groq':
      return new OpenAIProvider({ ...config, baseUrl: 'https://api.groq.com/openai/v1' });
    case 'cerebras':
      return new OpenAIProvider({ ...config, baseUrl: 'https://api.cerebras.ai/v1' });
    case 'ollama':
      return new OpenAIProvider({ ...config, baseUrl: config.baseUrl || 'http://localhost:11434/v1' });
    case 'lmstudio':
      return new OpenAIProvider({ ...config, baseUrl: config.baseUrl || 'http://localhost:1234/v1' });
    default:
      // Custom endpoint
      if (config.baseUrl) {
        return new OpenAIProvider(config);
      }
      throw new Error(`Unknown provider: ${config.name}`);
  }
}

export type { BaseLLMProvider, LLMResponse, StreamChunk };
