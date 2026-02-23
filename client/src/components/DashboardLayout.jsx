import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  // 1. We move the state here so the Layout knows if the sidebar is open or closed
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 flex overflow-hidden">
      {/* 2. Pass the state and the toggle function down to the Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* 3. Dynamically change the margin based on the state. 
             Added min-w-0 so charts don't overflow when resizing */}
      <div 
        className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <main className="flex-1 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}