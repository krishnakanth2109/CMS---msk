import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8faff] flex overflow-hidden">
      {/* Sidebar fixed to the left */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main content wrapper with dynamic margin */}
      <div 
        className={`flex-1 min-h-screen flex flex-col transition-all duration-500 ease-in-out min-w-0 ${
          isCollapsed ? 'ml-20' : 'ml-72'
        }`}
      >
        <main className="flex-1 w-full overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}