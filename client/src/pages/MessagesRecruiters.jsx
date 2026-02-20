import React, { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Inbox, Clock, Reply, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

let socket;

export default function RecruiterMessages() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  useEffect(() => {
    if (!user) return;

    // Socket Connection
    socket = io(SOCKET_URL);
    
    // Join room with specific User ID
    socket.emit('join_room', user.id);

    socket.on('receive_message', (newMessage) => {
      setMessages((prev) => [newMessage, ...prev]);
      toast({ title: "New Message from Admin", description: newMessage.subject });
    });

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/messages`, { headers: getAuthHeader() });
        if(res.ok) setMessages(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  const handleSendMessage = async () => {
    if (!content.trim() || !subject.trim()) {
      toast({ title: "Error", description: "Subject and message required", variant: "destructive" });
      return;
    }

    const newMessage = {
      from: user?.id, 
      to: 'admin',
      subject,
      content,
      createdAt: new Date().toISOString(),
      read: false
    };

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(newMessage)
      });

      if (res.ok) {
        const savedMsg = await res.json();
        socket.emit('send_message', savedMsg); // Notify admin
        
        setMessages((prev) => [savedMsg, ...prev]);
        setSubject('');
        setContent('');
        toast({ title: "Sent", description: "Reply sent to Admin" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send", variant: "destructive" });
    }
  };

  const myInbox = messages.filter(m => m.to === user?.id || m.to === 'all');

  if(loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">My Messages</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* INBOX */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Inbox className="w-5 h-5"/> Inbox</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {myInbox.length === 0 ? (
                   <div className="text-center py-10 text-gray-500">No messages yet.</div>
                ) : (
                  myInbox.map((msg, i) => (
                    <Card key={i} className="hover:shadow-md transition-all">
                      <CardContent className="pt-4">
                        <div className="flex justify-between mb-2">
                           <Badge className="bg-blue-600">Admin</Badge>
                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                             <Clock className="w-3 h-3"/> {new Date(msg.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                        <p className="font-bold text-sm">{msg.subject}</p>
                        <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{msg.content}</p>
                        <div className="flex justify-end mt-2">
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => setSubject(`Re: ${msg.subject}`)}>
                            <Reply className="w-3 h-3 mr-1"/> Reply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* REPLY FORM */}
            <Card>
              <CardHeader><CardTitle>Reply to Admin</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[150px]" />
                </div>
                <Button className="w-full" onClick={handleSendMessage} disabled={!content}>
                  <Send className="w-4 h-4 mr-2"/> Send Reply
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}