'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Database, Terminal, LogOut, Home } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  currentView?: 'databases' | 'tables' | 'query';
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { setToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    setToken(null);
    router.push('/auth/login');
  };

  const isActive = (view: string) => {
    if (view === 'databases') return pathname === '/' || pathname.startsWith('/database');
    if (view === 'query') return pathname === '/query';
    if (view === 'backups') return pathname === '/backups';
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">xDB Manager</h1>
              <p className="text-xs text-gray-500">Database Management Suite</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => router.push('/')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
                isActive('databases')
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Databases</span>
            </button>
            <button
              onClick={() => router.push('/query')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
                isActive('query')
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Terminal className="w-5 h-5" />
              <span>SQL Query</span>
            </button>
            <button
              onClick={() => router.push('/backups')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 ${
                isActive('backups')
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Database className="w-5 h-5" />
              <span>Backups</span>
            </button>
            <div className="pt-4 mt-4 border-t border-gray-200">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quick Info
              </p>
              <div className="px-4 py-3 text-xs text-gray-600 bg-gray-50 rounded-lg mt-2">
                <p className="font-medium mb-2">xDB v1.0</p>
                <p>Lightweight SQL database with in-memory query execution and persistent storage.</p>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
