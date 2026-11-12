import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function Sidebar() {
  const [channels, setChannels] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function fetchSidebarChannels() {
      try {
        const res = await api.get('/channels');
        if (Array.isArray(res.data)) {
          setChannels(res.data);
        } else {
          setChannels([]);
        }
      } catch (err) {
        console.error('Error fetching sidebar channels:', err);
        setChannels([]);
      }
    }
    fetchSidebarChannels();
    const interval = setInterval(fetchSidebarChannels, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className={`${
        isCollapsed ? 'w-14' : 'w-60'
      } bg-twitch-card border-r border-twitch-border flex flex-col transition-all duration-300 h-[calc(100vh-3.5rem)] sticky top-14 select-none z-40`}
    >
      {/* Sidebar Header */}
      <div className="p-3 flex items-center justify-between border-b border-twitch-border/40">
        {!isCollapsed && (
          <span className="text-xs font-bold uppercase tracking-wider text-twitch-muted">
            Canales Recomendados
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-twitch-muted hover:text-white p-1 rounded hover:bg-twitch-hover transition ml-auto"
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {channels.map((ch) => {
          const isActive = location.pathname === `/${ch.username}`;
          return (
            <Link
              key={ch.id}
              to={`/${ch.username}`}
              className={`flex items-center px-2.5 py-1.5 mx-1.5 rounded-md transition ${
                isActive
                  ? 'bg-twitch-purple/20 text-white font-medium'
                  : 'hover:bg-twitch-hover text-twitch-text'
              }`}
              title={ch.displayName}
            >
              {/* Channel Avatar with Live Ring */}
              <div className="relative flex-shrink-0">
                <img
                  src={ch.avatar}
                  alt={ch.displayName}
                  className={`w-8 h-8 rounded-full object-cover ${
                    ch.isLive ? 'ring-2 ring-red-500' : 'opacity-80'
                  }`}
                />
                {ch.isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-twitch-card rounded-full animate-ping"></span>
                )}
              </div>

              {/* Channel Info (visible if expanded) */}
              {!isCollapsed && (
                <div className="ml-3 flex-1 overflow-hidden flex items-center justify-between">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-semibold text-white truncate">{ch.displayName}</p>
                    <p className="text-[11px] text-twitch-muted truncate">{ch.category}</p>
                  </div>

                  {ch.isLive ? (
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-[11px] font-mono text-red-400">
                        {ch.viewerCount || 1}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-twitch-muted/60 font-medium">Offline</span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
