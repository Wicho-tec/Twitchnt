import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Tv, 
  Search, 
  Video, 
  LogOut, 
  User, 
  Compass, 
  Crown,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, channel, logout, setIsAuthModalOpen } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="h-14 bg-twitch-card border-b border-twitch-border px-4 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Left Navigation */}
      <div className="flex items-center space-x-6">
        <Link to="/" className="flex items-center space-x-2 text-twitch-purple hover:opacity-90 transition">
          <div className="bg-twitch-purple p-1.5 rounded-lg text-white">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white flex items-center">
            Twitch<span className="text-twitch-purple">nt</span>
            <span className="ml-1.5 text-[10px] bg-twitch-purple/20 text-twitch-purple px-1.5 py-0.5 rounded uppercase font-semibold border border-twitch-purple/30">
              Cloud
            </span>
          </span>
        </Link>

        <Link
          to="/"
          className="hidden md:flex items-center space-x-1.5 text-sm font-semibold text-twitch-text hover:text-twitch-purple transition"
        >
          <Compass className="w-4 h-4" />
          <span>Explorar</span>
        </Link>
      </div>

      {user && <Link to="/?tab=following" className="text-sm px-2 py-3 hover:text-twitch-purple">Siguiendo</Link>}
      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            placeholder="Buscar canales, categorías o streamers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-twitch-bg border border-twitch-border rounded-l-md px-3.5 py-1.5 text-sm text-white focus:outline-none focus:border-twitch-purple transition"
          />
          <button
            type="submit"
            className="bg-twitch-hover hover:bg-twitch-border border border-l-0 border-twitch-border text-twitch-muted hover:text-white px-3.5 py-1.5 rounded-r-md transition flex items-center justify-center"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {user ? (
          <div className="flex items-center space-x-3">
            {/* Creator Studio Button */}
            <Link
              to="/studio"
              className="flex items-center space-x-1.5 bg-twitch-purple hover:bg-twitch-darkPurple text-white px-3 py-1.5 rounded-md text-sm font-semibold transition shadow-md shadow-twitch-purple/20"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Panel de Control</span>
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full border border-twitch-border hover:border-twitch-purple transition object-cover"
                />
              </button>

              {showDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-twitch-card border border-twitch-border rounded-lg shadow-2xl py-2 z-50 text-sm"
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="px-4 py-2 border-b border-twitch-border flex items-center space-x-2.5">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-9 h-9 rounded-full border border-twitch-purple"
                    />
                    <div className="overflow-hidden">
                      <p className="font-semibold text-white truncate">{user.displayName}</p>
                      <p className="text-xs text-twitch-muted truncate">@{user.username}</p>
                    </div>
                  </div>

                  <Link
                    to={`/${user.username}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center space-x-2 px-4 py-2 hover:bg-twitch-hover text-twitch-text transition"
                  >
                    <Tv className="w-4 h-4 text-twitch-muted" />
                    <span>Mi Canal</span>
                  </Link>

                  <Link
                    to="/studio"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center space-x-2 px-4 py-2 hover:bg-twitch-hover text-twitch-text transition"
                  >
                    <Video className="w-4 h-4 text-twitch-muted" />
                    <span>Configurar Transmisión</span>
                  </Link>

                  <div className="border-t border-twitch-border my-1"></div>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center space-x-2 px-4 py-2 hover:bg-red-500/10 text-red-400 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-twitch-purple hover:bg-twitch-darkPurple text-white px-4 py-1.5 rounded-md text-sm font-semibold transition"
            >
              Iniciar Sesión / Registrarse
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
