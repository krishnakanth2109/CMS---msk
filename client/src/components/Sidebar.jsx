import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, Users, UserPlus, Briefcase, 
  Building2, Receipt, ClipboardList, MessageSquare, 
  BarChart, Settings, Calendar, User, ClipboardCheck, LogOut
} from 'lucide-react';

export default function Sidebar() {
  const { userRole, logout, currentUser } = useAuth();

  // 🔴 ADMIN LINKS
  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Candidates', path: '/admin/candidates', icon: Users },
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
    <div className="flex flex-col w-64 h-screen bg-zinc-900 text-zinc-300 shadow-xl fixed left-0 top-0">
      
      {/* Sidebar Header / Logo */}
      <div className="h-20 flex items-center px-6 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">RecruiterHub</span>
        </div>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-zinc-800">
        <p className="text-sm font-medium text-white truncate">{currentUser?.email || 'User'}</p>
        <p className="text-xs text-zinc-500 capitalize mt-1 border border-zinc-700 inline-block px-2 py-0.5 rounded-full">
          {userRole} Account
        </p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/admin' || link.path === '/recruiter'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group font-medium text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {link.name}
            </NavLink>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}