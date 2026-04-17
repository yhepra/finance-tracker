import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, Wallet } from 'lucide-react';

export default function SidebarLayout() {
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Laporan', icon: <FileText size={20} />, path: '/dashboard/reports' },
    { name: 'Pengaturan', icon: <Settings size={20} />, path: '/dashboard/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 shadow-xl flex flex-col text-white">
        <div className="h-20 flex items-center px-6 border-b border-blue-800">
          <Wallet className="text-blue-300 mr-3" size={28} />
          <span className="text-2xl font-bold tracking-tight">FinTrack</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="px-2 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4">Menu Utama</p>
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-800 text-white shadow-inner' 
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-blue-800">
          <NavLink
            to="/"
            className="flex items-center px-4 py-3 text-blue-200 hover:text-white transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Keluar</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-100">
        <div className="h-20 bg-white shadow-sm flex items-center justify-between px-8 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Finance Workspace</h2>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500 overflow-hidden shadow-sm">
              <img src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff" alt="User Profile" />
            </div>
          </div>
        </div>
        <div className="p-8 pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
