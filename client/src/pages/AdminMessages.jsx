import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, MessageSquare, Users, Search, Trash2, Plus, MoreVertical, Reply } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import io from 'socket.io-client';
import { format } from 'date-fns';

// ── ENV Config ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const getAuthHeader = () => {
  try {
    const stored = sessionStorage.getItem('currentUser');
    const token = stored ? JSON.parse(stored)?.idToken : null;
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
};

export default function AdminMessages() {
  const { toast } = useToast();
  
  // State
  const [messages, setMessages] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Compose State
  const [isComposing, setIsComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');

  // Socket Ref
  const socketRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    // Initialize Socket Connection
    socketRef.current = io(BASE_URL);
    socketRef.current.emit('join_room', 'admin'); 

    socketRef.current.on('receive_message', (newMessage) => {
      setMessages((prev) => [newMessage, ...prev]);
      toast({ title: "New Message", description: `From ${newMessage.fromName || newMessage.from}` });
    });

    const fetchData = async () => {
      setLoading(true);
      try {
        const [msgRes, recRes] = await Promise.all([
          fetch(`${API_URL}/messages`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/recruiters`, { headers: getAuthHeader() })
        ]);

        if(msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data);
          // Select first message if available
          const inbox = data.filter((m) => m.to === 'admin' && m.from !== 'admin');
          if (inbox.length > 0) setSelectedMessage(inbox[0]);
        }
        
        if(recRes.ok) {
          const recData = await recRes.json();
          setRecruiters(Array.isArray(recData) ? recData : []);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup socket on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [toast]);

  // --- Handlers ---
  const handleSendMessage = async () => {
    if (!content.trim() || !subject.trim() || !recipient) {
      toast({ title: "Validation Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    const newMessage = { to: recipient, subject, content };

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newMessage)
      });

      if (res.ok) {
        const savedMsg = await res.json();
        
        // Emit via socket
        if (socketRef.current) {
          socketRef.current.emit('send_message', savedMsg);
        }
        
        setMessages((prev) => [savedMsg, ...prev]);
        setSubject('');
        setContent('');
        setRecipient('');
        setIsComposing(false);
        toast({ title: "Success", description: "Message sent successfully" });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteMessage = async (e, id) => {
    e.stopPropagation(); // Prevent selecting the message while deleting
    if(!confirm("Are you sure you want to delete this message?")) return;
    
    try {
      const res = await fetch(`${API_URL}/messages/${id}`, { 
        method: 'DELETE', 
        headers: getAuthHeader() 
      });

      if (res.ok) {
        setMessages(prev => prev.filter(m => m._id !== id));
        if (selectedMessage?._id === id) setSelectedMessage(null);
        toast({ title: "Deleted", description: "Message removed successfully" });
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not delete message", variant: "destructive" });
    }
  };

  const handleReply = (msg) => {
    setRecipient(msg.from);
    setSubject(`Re: ${msg.subject}`);
    setIsComposing(true);
  };

  const getRecruiterName = (id) => {
    if (id === 'admin') return 'Admin';
    if (id === 'all') return 'Everyone';
    const r = recruiters.find(rec => rec._id === id || rec.id === id);
    return r ? r.name : 'Unknown';
  };

  // --- Filtering ---
  const filteredMessages = messages.filter(m => {
    const isInbox = activeTab === 'inbox';
    // Inbox: To Admin (from others). Sent: From Admin.
    const matchesTab = isInbox ? (m.to === 'admin' && m.from !== 'admin') : (m.from === 'admin');
    
    const matchesSearch = 
      (m.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.fromName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesTab && matchesSearch;
  });

  // Calculate Inbox Count
  const inboxCount = messages.filter(m => m.to === 'admin' && m.from !== 'admin').length;

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          Communications
          {inboxCount > 0 && <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{inboxCount} New</span>}
        </h1>
        <Button onClick={() => { setIsComposing(true); setRecipient(''); setSubject(''); setContent(''); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Compose
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Message List */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-0">
          
          {/* Search & Tabs */}
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input 
                placeholder="Search messages..." 
                className="pl-9 bg-gray-100 dark:bg-gray-700 border-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button 
                onClick={() => { setActiveTab('inbox'); setIsComposing(false); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'inbox' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Inbox
                {inboxCount > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {inboxCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => { setActiveTab('sent'); setIsComposing(false); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'sent' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Sent
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No messages found.</div>
            ) : (
              filteredMessages.map((msg) => (
                <div 
                  key={msg._id}
                  onClick={() => { setSelectedMessage(msg); setIsComposing(false); }}
                  className={`group p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedMessage?._id === msg._id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate pr-2">
                      {activeTab === 'inbox' ? (msg.fromName || getRecruiterName(msg.from)) : `To: ${msg.toName || getRecruiterName(msg.to)}`}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(msg.createdAt), 'MMM d')}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{msg.subject}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{msg.content}</p>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDeleteMessage(e, msg._id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content: Detail or Compose */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col z-0">
          
          {isComposing ? (
            /* COMPOSE VIEW */
            <div className="h-full flex flex-col p-8 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">
                  <Send className="w-5 h-5 text-blue-600"/> New Message
                </h2>
                
                <div className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Recipient</label>
                    <Select value={recipient} onValueChange={setRecipient}>
                      <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 border-none h-10">
                        <SelectValue placeholder="Select Recipient..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all"><Users className="w-4 h-4 inline mr-2"/> Broadcast to All</SelectItem>
                        {recruiters.map(r => (
                          <SelectItem key={r._id || r.id} value={r._id || r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Subject</label>
                    <Input 
                      value={subject} 
                      onChange={e => setSubject(e.target.value)} 
                      className="bg-gray-50 dark:bg-gray-700 dark:border-gray-600 border-none h-10 font-medium"
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div className="space-y-1 h-full flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Message</label>
                    <Textarea 
                      value={content} 
                      onChange={e => setContent(e.target.value)} 
                      className="bg-gray-50 dark:bg-gray-700 dark:border-gray-600 border-none resize-none flex-1 p-4 text-base" 
                      placeholder="Type your message here..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsComposing(false)}>Discard</Button>
                  <Button onClick={handleSendMessage} disabled={!content || !recipient} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                    Send Message <Send className="w-4 h-4 ml-2"/>
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedMessage ? (
            /* DETAIL VIEW */
            <div className="h-full flex flex-col">
              {/* Message Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedMessage.subject}</h2>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                            {activeTab === 'inbox' 
                              ? (selectedMessage.fromName?.[0] || selectedMessage.from[0]).toUpperCase() 
                              : 'A'}
                         </div>
                         <div>
                           <span className="font-semibold text-gray-900 dark:text-white block">
                             {activeTab === 'inbox' ? (selectedMessage.fromName || selectedMessage.from) : 'You (Admin)'}
                           </span>
                           <span className="text-gray-500 text-xs">
                             To: {selectedMessage.to === 'all' ? 'Everyone' : (selectedMessage.toName || getRecruiterName(selectedMessage.to))}
                           </span>
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 mr-2">
                      {format(new Date(selectedMessage.createdAt), 'PPp')}
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {activeTab === 'inbox' && (
                          <DropdownMenuItem onClick={() => handleReply(selectedMessage)}>
                            <Reply className="w-4 h-4 mr-2"/> Reply
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => handleDeleteMessage(e, selectedMessage._id)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2"/> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[50%] whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                    {selectedMessage.content}
                 </div>
              </div>

              {/* Quick Reply Bar (Inbox Only) */}
              {activeTab === 'inbox' && (
                 <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <Button onClick={() => handleReply(selectedMessage)} variant="outline" className="w-full justify-start text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                       <Reply className="w-4 h-4 mr-2"/> Click to reply...
                    </Button>
                 </div>
              )}
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20"/>
              <p>Select a message to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}