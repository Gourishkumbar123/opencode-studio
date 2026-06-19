'use client';

import { useState } from 'react';
import { Key, Globe, Shield, Palette } from 'lucide-react';

interface SettingsState {
  apiKeys: Record<string, string>;
  defaultProvider: string;
  defaultModel: string;
  sandboxMode: 'readonly' | 'ask_edit' | 'ask_command' | 'autonomous';
  theme: 'light' | 'dark' | 'system';
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    apiKeys: {
      openrouter: '',
      anthropic: '',
      openai: '',
      google: '',
    },
    defaultProvider: 'openrouter',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    sandboxMode: 'ask_edit',
    theme: 'dark',
  });
  
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        {/* API Keys Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">API Keys</h2>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                OpenRouter (Recommended)
              </label>
              <input
                type="password"
                value={settings.apiKeys.openrouter}
                onChange={(e) => setSettings({
                  ...settings,
                  apiKeys: { ...settings.apiKeys, openrouter: e.target.value }
                })}
                placeholder="sk-or-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">openrouter.ai</a>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Anthropic
              </label>
              <input
                type="password"
                value={settings.apiKeys.anthropic}
                onChange={(e) => setSettings({
                  ...settings,
                  apiKeys: { ...settings.apiKeys, anthropic: e.target.value }
                })}
                placeholder="sk-ant-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                OpenAI
              </label>
              <input
                type="password"
                value={settings.apiKeys.openai}
                onChange={(e) => setSettings({
                  ...settings,
                  apiKeys: { ...settings.apiKeys, openai: e.target.value }
                })}
                placeholder="sk-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>
        
        {/* Provider Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Provider</h2>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Default Provider
              </label>
              <select
                value={settings.defaultProvider}
                onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openrouter">OpenRouter (Recommended)</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google Gemini</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Default Model
              </label>
              <input
                type="text"
                value={settings.defaultModel}
                onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                placeholder="anthropic/claude-3.5-sonnet"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use provider default
              </p>
            </div>
          </div>
        </section>
        
        {/* Security Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Security</h2>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Sandbox Mode
            </label>
            <select
              value={settings.sandboxMode}
              onChange={(e) => setSettings({ ...settings, sandboxMode: e.target.value as SettingsState['sandboxMode'] })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="readonly">Read Only - View code only</option>
              <option value="ask_edit">Ask Before Edit - Confirm each modification</option>
              <option value="ask_command">Ask Before Command - Confirm each command</option>
              <option value="autonomous">Autonomous - No confirmation needed</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controls when OpenCode Studio asks for permission before actions
            </p>
          </div>
        </section>
        
        {/* Theme Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value as SettingsState['theme'] })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </section>
        
        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
          
          {saved && (
            <span className="text-green-400 text-sm">Settings saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
