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
  // This aggressively looks for your token everywhere to guarantee it sends!
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
      const headers = await getSafeHeaders(); // Grab token right before sending
      
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">My Messages</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {messages.length === 0 ? (
                 <div className="text-center py-10 text-gray-500">No messages yet. Start a conversation with Admin.</div>
              ) : (
                messages.map((msg, i) => {
                  const isFromAdmin = msg.from === 'admin' || msg.fromName === 'Admin';

                  return (
                    <Card key={msg._id || i} className={`hover:shadow-md transition-all ${!isFromAdmin ? 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/10' : 'border-l-4 border-l-blue-500'}`}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between mb-2">
                           <Badge className={isFromAdmin ? "bg-blue-600" : "bg-green-600 hover:bg-green-700"}>
                             {isFromAdmin ? 'Admin' : 'You (Sent)'}
                           </Badge>
                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                             <Clock className="w-3 h-3"/> 
                             {new Date(msg.createdAt).toLocaleDateString()} at {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <p className="font-bold text-sm">{msg.subject}</p>
                        <p className="text-sm mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.content}</p>
                        
                        {isFromAdmin && (
                          <div className="flex justify-end mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-blue-600" 
                              onClick={() => setSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`)}
                            >
                              <Reply className="w-3 h-3 mr-1"/> Reply
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Send to Admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[150px] resize-none" placeholder="Type your message here..." />
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSendMessage} disabled={!content.trim() || !subject.trim()}>
                <Send className="w-4 h-4 mr-2"/> Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}