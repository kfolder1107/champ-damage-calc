import { useState } from 'react'
import { useDarkMode } from '@/presentation/hooks/useDarkMode'
import { Calculator } from '@/presentation/pages/Calculator'
import { TeamManager } from '@/presentation/pages/TeamManager'
import { APP_VERSION } from '@/infrastructure/version'

type Tab = 'calc' | 'team'

export default function App() {
  const { isDark, toggle } = useDarkMode()
  const [activeTab, setActiveTab] = useState<Tab>('calc')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Pokemon Champions
              <span className="ml-1.5 text-xs sm:text-sm font-normal text-slate-600 dark:text-slate-400">ダメージ計算</span>
            </h1>

            {/* タブナビゲーション */}
            <nav className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('calc')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'calc'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ダメージ計算
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('team')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'team'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                チーム管理
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors
                         border-slate-300 dark:border-slate-600
                         text-slate-600 dark:text-slate-300
                         hover:bg-slate-100 dark:hover:bg-slate-800
                         hover:border-slate-400 dark:hover:border-slate-500"
              title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? '☀️ ライト' : '🌙 ダーク'}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-600 font-mono flex-shrink-0">v{APP_VERSION}</span>
          </div>
        </div>
      </header>

      <main>
        {activeTab === 'calc' ? <Calculator /> : <TeamManager />}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 mt-8 py-4 text-center text-xs text-slate-500 dark:text-slate-600">
        Pokemon Champions シングルバトル専用 | v{APP_VERSION}
      </footer>
    </div>
  )
}
