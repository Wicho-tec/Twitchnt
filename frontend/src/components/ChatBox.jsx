import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  Send, 
  Users, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Smile
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ChatBox({ channelUsername }) {
  const { user, setIsAuthModalOpen } = useAuth();
  const [chatError, setChatError] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history and setup Socket.io
  useEffect(() => {
    if (!channelUsername) return;

    // Fetch initial chat history
    async function loadHistory() {
      try {
        const res = await api.get(`/channels/${channelUsername}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    }
    loadHistory();

    // Setup Socket.io connection
    const socket = io(window.location.origin, {
      path: '/socket.io',
      auth: { token: localStorage.getItem('twitchnt_token') },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_channel', {
        channelUsername,
        user: user ? {
          username: user.username,
          displayName: user.displayName,
          role: user.role
        } : null
      });
    });

    socket.on('chat:error', setChatError);
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('viewer_count_update', (data) => {
      if (data.channel.toLowerCase() === channelUsername.toLowerCase()) {
        setViewerCount(data.count);
      }
    });

    return () => {
      socket.emit('leave_channel', { channelUsername });
      socket.disconnect();
    };
  }, [channelUsername, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setChatError('');
    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        channelUsername,
        content: inputMessage.trim(),
        user: {
          username: user.username,
          displayName: user.displayName,
          role: user.role
        }
      });
      setInputMessage('');
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-twitch-card border-l border-twitch-border flex flex-col items-center py-4 justify-between h-[calc(100vh-3.5rem)] sticky top-14">
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-twitch-muted hover:text-white p-2 rounded hover:bg-twitch-hover transition"
          title="Expandir Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-80 lg:shrink-0 bg-twitch-card border-l border-twitch-border flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none">
      {/* Chat Header */}
      <div className="h-12 border-b border-twitch-border px-3.5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-twitch-muted hover:text-white p-1 rounded hover:bg-twitch-hover transition"
          title="Colapsar Chat"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-twitch-text">
          Chat de la Transmisión
        </span>

        <div className="flex items-center space-x-1.5 text-xs text-twitch-muted bg-twitch-bg px-2 py-1 rounded-md border border-twitch-border/60">
          <Users className="w-3.5 h-3.5 text-red-400" />
          <span className="font-semibold text-white font-mono">{viewerCount}</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs leading-relaxed">
        <div className="bg-twitch-bg/60 border border-twitch-border/40 p-2.5 rounded text-[11px] text-twitch-muted text-center mb-3">
          ¡Bienvenido a la sala de chat de <span className="font-semibold text-white">#{channelUsername}</span>! Sé amable y respeta las normas de la comunidad.
        </div>

        {messages.map((m) => (
          <div key={m.id} className="break-words hover:bg-twitch-hover/50 p-1 rounded transition">
            <span className="text-[10px] text-twitch-muted/60 mr-1.5 font-mono">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Badges */}
            {m.badge === 'BROADCASTER' && (
              <span className="inline-flex items-center mr-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white uppercase tracking-wider">
                Streamer
              </span>
            )}
            {m.badge === 'MOD' && (
              <span className="inline-flex items-center mr-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-green-600 text-white uppercase tracking-wider">
                <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline" />
                Mod
              </span>
            )}
            {m.badge === 'ADMIN' && (
              <span className="inline-flex items-center mr-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-twitch-purple text-white uppercase tracking-wider">
                Admin
              </span>
            )}

            {/* Username with color */}
            <span
              className="font-bold mr-1 cursor-pointer hover:underline"
              style={{ color: m.color || '#9146FF' }}
            >
              {m.displayName || m.username}:
            </span>

            {/* Message Body */}
            <span className="text-twitch-text">{m.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {chatError && <p role="alert" className="px-3 text-sm text-red-400">{chatError}</p>}
      {/* Chat Input Bar */}
      <div className="p-3 border-t border-twitch-border bg-twitch-bg flex-shrink-0">
        {user ? (
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="relative flex items-center">
              <input
                type="text"
                aria-label="Mensaje de chat" placeholder="Enviar un mensaje..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                maxLength={300}
                className="w-full bg-twitch-card border border-twitch-border rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder-twitch-muted focus:outline-none focus:border-twitch-purple transition"
              />
              <button
                type="submit"
                aria-label="Enviar mensaje"
                disabled={!inputMessage.trim()}
                className="absolute right-1.5 bg-twitch-purple hover:bg-twitch-darkPurple disabled:opacity-40 disabled:hover:bg-twitch-purple text-white p-1.5 rounded-md transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-twitch-muted">
              <span>Chateando como <span className="font-semibold text-twitch-purple">{user.displayName}</span></span>
              <span>{inputMessage.length}/300</span>
            </div>
          </form>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-twitch-muted mb-2">Inicia sesión para participar en el chat</p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full bg-twitch-purple hover:bg-twitch-darkPurple text-white py-1.5 rounded-md text-xs font-semibold transition"
            >
              Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
