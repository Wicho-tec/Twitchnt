import React from 'react';
import { Link } from 'react-router-dom';

export default function ChannelCard({ channel }) {
  return (
    <Link
      to={`/${channel.username}`}
      className="group flex flex-col space-y-2 select-none"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-twitch-card border border-twitch-border/60 group-hover:border-twitch-purple group-hover:shadow-lg group-hover:shadow-twitch-purple/10 transition-all duration-200">
        <img
          src={channel.thumbnail || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60'}
          alt={channel.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Live Badge */}
        {channel.isLive ? (
          <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-red-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>EN VIVO</span>
          </div>
        ) : (
          <div className="absolute top-2 left-2 bg-twitch-bg/80 backdrop-blur-sm text-twitch-muted font-medium text-[10px] uppercase px-2 py-0.5 rounded border border-twitch-border">
            OFFLINE
          </div>
        )}

        {/* Viewer Count */}
        {channel.isLive && (
          <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white font-mono text-[11px] px-2 py-0.5 rounded">
            {channel.viewerCount || 1} espectadores
          </div>
        )}
      </div>

      {/* Info Row */}
      <div className="flex space-x-2.5 pt-1">
        <img
          src={channel.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.username}`}
          alt={channel.displayName}
          className="w-9 h-9 rounded-full object-cover border border-twitch-border flex-shrink-0 group-hover:border-twitch-purple transition"
        />

        <div className="overflow-hidden flex-1">
          <h4 className="text-xs font-bold text-white group-hover:text-twitch-purple transition truncate leading-snug">
            {channel.title}
          </h4>
          <p className="text-[11px] text-twitch-muted truncate">{channel.displayName || channel.username}</p>
          <span className="inline-block mt-1 text-[10px] font-semibold bg-twitch-hover text-twitch-muted group-hover:text-white px-2 py-0.5 rounded-full border border-twitch-border/60 transition">
            {channel.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
