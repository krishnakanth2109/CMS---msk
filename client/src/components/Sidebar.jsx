import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, Users, UserPlus, Briefcase, 
  Building2, Receipt, ClipboardList, MessageSquare, 
  BarChart, Settings, Calendar, User, ClipboardCheck, 
  Power, ChevronLeft, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { userRole, logout, currentUser } = useAuth();
  
  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Add Candidate', path: '/admin/add-candidate', icon: UserPlus },
    { name: 'Recruiters', path: '/admin/recruiters', icon: Briefcase },
    { name: 'Client Info', path: '/admin/clients', icon: Building2 },
    { name: 'Invoices', path: '/admin/invoices', icon: Receipt },
    { name: 'Requirements', path: '/admin/requirements', icon: ClipboardList },
    { name: 'Messages', path: '/admin/messages', icon: MessageSquare },
    { name: 'Reports', path: '/admin/reports', icon: BarChart },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const recruiterLinks = [
    { name: 'Dashboard', path: '/recruiter', icon: LayoutDashboard },
    { name: 'My Candidates', path: '/recruiter/candidates', icon: Users },
    { name: 'Assignments', path: '/recruiter/assignments', icon: ClipboardCheck },
    { name: 'Schedules', path: '/recruiter/schedules', icon: Calendar },
    { name: 'Messages', path: '/recruiter/messages', icon: MessageSquare },
    { name: 'Reports', path: '/recruiter/reports', icon: BarChart },
    { name: 'My Profile', path: '/recruiter/profile', icon: User },
    { name: 'Settings', path: '/recruiter/settings', icon: Settings },
  ];

  const links = userRole === 'admin' ? adminLinks : recruiterLinks;

  return (
    <div 
      className={clsx(
        "flex flex-col h-screen bg-[#4d47c4] text-white shadow-2xl fixed left-0 top-0 transition-all duration-500 ease-in-out z-40",
        isCollapsed ? "w-20 rounded-r-[2rem]" : "w-72 rounded-r-[3.5rem]"
      )}
    >
      {/* Header / Logo */}
      <div className={clsx(
        "h-24 flex items-center transition-all duration-300",
        isCollapsed ? "justify-center px-0" : "px-8"
      )}>
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          {!isCollapsed && (
            <span className="text-white font-bold text-2xl tracking-tight whitespace-nowrap">
              VTS Tracker
            </span>
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div className={clsx(
        "transition-all duration-300 mb-6",
        isCollapsed ? "px-4 flex justify-center" : "px-6"
      )}>
        <div className={clsx(
          "bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-4 transition-all",
          isCollapsed ? "w-12 h-12 p-0 flex items-center justify-center" : "w-full"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              {/* UPDATED: Removed img (US initials) and added User icon */}
              <div className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center bg-white/20 shadow-inner">
                 <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 truncate">{currentUser?.email || 'Admin Account'}</p>
                <div className="mt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {userRole} Account
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <User className="h-5 w-5 text-white/80" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-none">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/admin' || link.path === '/recruiter'}
            className={({ isActive }) =>
              clsx(
                "flex items-center rounded-2xl transition-all duration-300 font-bold text-sm h-12",
                isCollapsed ? "justify-center" : "px-4 gap-4",
                isActive
                  ? "bg-white text-[#4d47c4] shadow-xl translate-x-1" 
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <link.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{link.name}</span>}
          </NavLink>
        ))}
      </div>

      {/* Footer / Power Button */}
      <div className="p-8 flex justify-center border-t border-white/10">
        <button
          onClick={logout}
          className={clsx(
            "flex items-center justify-center transition-all duration-300 group",
            isCollapsed 
              ? "w-12 h-12 bg-white/10 hover:bg-red-500 rounded-full" 
              : "w-full h-14 bg-white/10 hover:bg-red-500 border border-white/20 rounded-2xl shadow-lg"
          )}
        >
          <Power className={clsx(
            "h-6 w-6 text-red-500 group-hover:text-white transition-colors duration-300"
          )} />
          {!isCollapsed && (
            <span className="ml-3 font-black uppercase text-xs tracking-widest text-red-500 group-hover:text-white">
              Sign Out
            </span>
          )}
        </button>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white text-[#4d47c4] border-4 border-[#f8faff] rounded-full p-1.5 hover:scale-110 transition-all z-50 shadow-xl"
      >
        {isCollapsed ? <ChevronRight size={20} strokeWidth={3} /> : <ChevronLeft size={20} strokeWidth={3} />}
      </button>
    </div>
  );
}