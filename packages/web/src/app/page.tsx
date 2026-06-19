'use client';

import { useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { Sidebar } from '@/components/Sidebar';
import { Settings } from '@/components/Settings';

export default function Home() {
  const [activeView, setActiveView] = useState<'chat' | 'settings' | 'history' | 'projects'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && (
          <ChatInterface 
            sessionId={sessionId} 
            onSessionChange={setSessionId}
          />
        )}
        
        {activeView === 'settings' && <Settings />}
        
        {activeView === 'history' && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Conversation History</h2>
              <p className="text-gray-400">Your conversation history will appear here</p>
            </div>
          </div>
        )}
        
        {activeView === 'projects' && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Projects</h2>
              <p className="text-gray-400">Manage your projects here</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
