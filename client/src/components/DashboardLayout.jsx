import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area (offset by the sidebar width: ml-64) */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* You can add a Topbar here later if needed */}
        
        <main className="flex-1 p-8">
          {/* Outlet is where the actual page components (like AdminDashboard) will be rendered */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}