import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#f3f6fd] flex font-sans text-slate-800">
      {/* Sidebar fixed to the left */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex-1 min-h-screen flex flex-col ml-80 transition-all duration-300 ease-in-out">
        <main className="flex-1 w-full p-4 md:p-8 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}