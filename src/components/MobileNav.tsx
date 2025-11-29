import React from 'react';
import { Home, CreditCard, BarChart3, Target, Settings } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, darkMode }) => {
  const tabs = [
    { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home' },
    { id: 'transactions', icon: <CreditCard className="w-5 h-5" />, label: 'History' },
    { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Stats' },
    { id: 'goals', icon: <Target className="w-5 h-5" />, label: 'Goals' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 md:hidden ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      } border-t z-40 shadow-lg`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center py-2 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
              activeTab === tab.id
                ? darkMode
                  ? 'text-indigo-400 bg-indigo-900/30'
                  : 'text-indigo-600 bg-indigo-50'
                : darkMode
                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span
              className={`transition-transform duration-200 ${
                activeTab === tab.id ? 'scale-110' : ''
              }`}
            >
              {tab.icon}
            </span>
            <span
              className={`text-xs mt-1 font-medium transition-opacity duration-200 ${
                activeTab === tab.id ? 'opacity-100' : 'opacity-70'
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
