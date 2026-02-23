import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, Users, UserPlus, Briefcase, 
  Building2, Receipt, ClipboardList, MessageSquare, 
  BarChart, Settings, Calendar, User, ClipboardCheck, 
  LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const { userRole, logout, currentUser } = useAuth();
  
  // State to control Sidebar Collapse/Expand
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 🔴 ADMIN LINKS
  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    // { name: 'Candidates', path: '/admin/candidates', icon: Users },
    { name: 'Add Candidate', path: '/admin/add-candidate', icon: UserPlus },
    { name: 'Recruiters', path: '/admin/recruiters', icon: Briefcase },
    { name: 'Client Info', path: '/admin/clients', icon: Building2 },
    { name: 'Invoices', path: '/admin/invoices', icon: Receipt },
    { name: 'Requirements', path: '/admin/requirements', icon: ClipboardList },
    { name: 'Messages', path: '/admin/messages', icon: MessageSquare },
    { name: 'Reports', path: '/admin/reports', icon: BarChart },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  // 🔵 RECRUITER LINKS
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

  // Determine which links to show
  const links = userRole === 'admin' ? adminLinks : recruiterLinks;

  return (
    <div 
      className={`flex flex-col h-screen bg-zinc-900 text-zinc-300 shadow-xl fixed left-0 top-0 transition-all duration-300 ease-in-out z-40 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full p-1.5 hover:text-white hover:bg-zinc-700 transition-colors z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      
      {/* Sidebar Header / Logo */}
      <div className={`h-20 flex items-center border-b border-zinc-800 bg-zinc-950 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          {!isCollapsed && (
            <span className="text-white font-bold text-xl tracking-tight whitespace-nowrap animate-in fade-in duration-300">
              VTS Tracker
            </span>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className={`border-b border-zinc-800 transition-all duration-300 ${isCollapsed ? 'p-4 flex justify-center' : 'p-6'}`}>
        {!isCollapsed ? (
          <div className="overflow-hidden animate-in fade-in duration-300">
            <p className="text-sm font-medium text-white truncate w-full">{currentUser?.email || 'User'}</p>
            <p className="text-xs text-zinc-500 capitalize mt-1 border border-zinc-700 inline-block px-2 py-0.5 rounded-full">
              {userRole} Account
            </p>
          </div>
        ) : (
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center" title={currentUser?.email || 'User'}>
            <User className="h-5 w-5 text-zinc-400" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700 overflow-x-hidden">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              title={isCollapsed ? link.name : undefined} // Shows tooltip when collapsed
              end={link.path === '/admin' || link.path === '/recruiter'}
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 group font-medium text-sm ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="whitespace-nowrap animate-in fade-in duration-300">
                  {link.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={logout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`flex items-center w-full rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${
            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
          }`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
             <span className="whitespace-nowrap animate-in fade-in duration-300">Sign Out</span>
          )}
        </button>
      </div>
    </div>
  );
}