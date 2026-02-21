import React, { useState } from 'react';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Plain Tailwind helpers ───────────────────────────────────────────────────
const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}
  </label>
);

const Button = ({ children, onClick, disabled, className = '', variant = 'default', type = 'button' }) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    ghost: 'bg-transparent text-gray-500 hover:bg-transparent',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </button>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export default function RecruiterSettings() {
  const { toast } = useToast();

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setPasswords(prev => ({ ...prev, [id]: value }));
  };

  const toggleVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleUpdatePassword = async () => {
    if (!passwords.newPassword || !passwords.confirmPassword) {
      toast({ title: "Validation Error", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "Mismatch Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast({ title: "Security Warning", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ password: passwords.newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update password');

      toast({ title: "Success", description: "Your password has been updated successfully." });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Password update error:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update password. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your security preferences</p>
        </div>

        {/* Password Change Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md">
          {/* Card Header */}
          <div className="px-6 pt-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Update your password regularly to keep your account secure.</p>
          </div>

          {/* Card Body */}
          <div className="px-6 py-6 space-y-4">

            {/* Current Password */}
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwords.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => toggleVisibility('current')}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwords.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => toggleVisibility('new')}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwords.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => toggleVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePassword}
                disabled={loading || !passwords.newPassword}
                className="min-w-[140px]"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
