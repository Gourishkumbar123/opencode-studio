'use client';

import { MessageSquare, Settings, History, FolderGit2, Code2 } from 'lucide-react';

type View = 'chat' | 'settings' | 'history' | 'projects';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const navItems = [
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'projects' as const, icon: FolderGit2, label: 'Projects' },
  { id: 'history' as const, icon: History, label: 'History' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-16 hover:w-56 bg-gray-900 border-r border-gray-800 transition-all duration-200 flex flex-col py-4 group">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            OpenCode
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
      
      {/* Version */}
      <div className="px-4 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
        v0.1.0
      </div>
    </aside>
  );
}
