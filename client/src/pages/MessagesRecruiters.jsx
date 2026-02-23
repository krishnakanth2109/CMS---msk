import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Send, MessageSquare, Clock, Reply, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import io from 'socket.io-client';

// ── ENV Config ────────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL = `${BASE_URL}/api`;

export default function MessagesRecruiters() {
  const { currentUser, authHeaders } = useAuth(); 
  const { toast } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const socketRef = useRef(null);

  // ── Bulletproof Token Grabber ───────────────────────────────────────────────
  const getSafeHeaders = async () => {
    let token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    
    // Fallback: check inside currentUser object
    if (!token) {
      try {
        const storedUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          token = parsed.token || parsed.idToken;
        }
      } catch (e) {}
    }

    // Fallback: try authHeaders from Context
    if (!token && typeof authHeaders === 'function') {
      try {
        const h = await authHeaders();
        if (h && h.Authorization) return { 'Content-Type': 'application/json', ...h };
      } catch (e) {}
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    };
  };

  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser._id || currentUser.id;

    socketRef.current = io(BASE_URL);
    socketRef.current.emit('join_room', userId);

    socketRef.current.on('receive_message', (newMessage) => {
      setMessages((prev) => [newMessage, ...prev]);
      toast({ title: "New Message from Admin", description: newMessage.subject });
    });

    const fetchMessages = async () => {
      try {
        const headers = await getSafeHeaders();
        const res = await fetch(`${API_URL}/messages`, { headers });
        
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        } else if (res.status === 401) {
          toast({ title: "Session Expired", description: "Please sign out and sign back in.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [currentUser, toast]);

  const handleSendMessage = async () => {
    if (!content.trim() || !subject.trim()) {
      toast({ title: "Validation Error", description: "Subject and message are required.", variant: "destructive" });
      return;
    }

    const newMessage = {
      to: 'admin',
      subject,
      content,
    };

    try {
      const headers = await getSafeHeaders(); 
      
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(newMessage)
      });

      const responseData = await res.json();

      if (res.ok) {
        if (socketRef.current) socketRef.current.emit('send_message', responseData); 
        
        setMessages((prev) => [responseData, ...prev]);
        setSubject('');
        setContent('');
        toast({ title: "Sent", description: "Message sent to Admin successfully!" });
      } else {
        throw new Error(responseData.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Send Error:", error);
      toast({ 
        title: "Failed to Send", 
        description: error.message === "Not authorized, token failed" || error.message.includes("expired") 
          ? "Your session expired. Please Sign Out and Sign Back In." 
          : error.message, 
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">My Messages</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Conversation List */}
          <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <MessageSquare className="w-5 h-5 text-slate-500" /> Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto p-6">
              {messages.length === 0 ? (
                 <div className="text-center py-10 text-slate-400">No messages yet. Start a conversation with Admin.</div>
              ) : (
                messages.map((msg, i) => {
                  const isFromAdmin = msg.from === 'admin' || msg.fromName === 'Admin';

                  return (
                    <div 
                      key={msg._id || i} 
                      className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                        isFromAdmin 
                          ? 'bg-white border-l-4 border-l-blue-600 border-slate-200' 
                          : 'bg-white border-l-4 border-l-slate-400 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between mb-2 items-center">
                         <Badge 
                           className={`font-normal ${
                             isFromAdmin 
                               ? "bg-blue-100 text-blue-700 hover:bg-blue-100" 
                               : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                           }`}
                         >
                           {isFromAdmin ? 'Admin' : 'You (Sent)'}
                         </Badge>
                         <span className="text-xs text-slate-400 flex items-center gap-1">
                           <Clock className="w-3 h-3"/> 
                           {new Date(msg.createdAt).toLocaleDateString()} at {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                      
                      <p className="font-semibold text-sm text-slate-900">{msg.subject}</p>
                      <p className="text-sm mt-1.5 text-slate-600 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      
                      {isFromAdmin && (
                        <div className="flex justify-end mt-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3" 
                            onClick={() => setSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`)}
                          >
                            <Reply className="w-3.5 h-3.5 mr-1.5"/> Reply
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Compose Box */}
          <Card className="h-fit bg-white border border-slate-200 shadow-sm sticky top-6">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-slate-800">Send to Admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Subject</label>
                <Input 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  placeholder="Subject..." 
                  className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Message</label>
                <Textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  className="min-h-[150px] resize-none bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500" 
                  placeholder="Type your message here..." 
                />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all" 
                onClick={handleSendMessage} 
                disabled={!content.trim() || !subject.trim()}
              >
                <Send className="w-4 h-4 mr-2"/> Send Message
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}