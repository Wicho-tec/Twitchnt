import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Radio, Sparkles, Filter, Video, Cloud, Server, Cpu } from 'lucide-react';
import ChannelCard from '../components/ChannelCard';
import api from '../services/api';

const CATEGORIES = [
  'Todos',
  'Software & Game Development',
  'Gaming',
  'Just Chatting',
  'Cómputo en la Nube',
  'Música',
  'Tecnología & Ciencia'
];

export default function Home() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const followingOnly = searchParams.get('tab') === 'following';

  useEffect(() => {
    async function fetchChannels() {
      try {
        const res = await api.get(followingOnly ? '/following' : '/channels');
        if (Array.isArray(res.data)) {
          setChannels(res.data);
        } else {
          setChannels([]);
        }
      } catch (err) {
        console.error('Error fetching channels:', err);
        setChannels([]);
      } finally {
        setLoading(false);
      }
    }
    fetchChannels();
    const interval = setInterval(fetchChannels, 8000);
    return () => clearInterval(interval);
  }, [followingOnly]);

  const channelList = Array.isArray(channels) ? channels : [];
  const filteredChannels = channelList.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'Todos' || c.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const liveChannels = filteredChannels.filter((c) => c.isLive);
  const offlineChannels = filteredChannels.filter((c) => !c.isLive);
  const featuredStream = channelList.find((c) => c.isLive) || channelList[0];

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-8">
      {/* Cloud Architecture Hero Banner */}
      {!searchQuery && featuredStream && (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-twitch-card via-purple-950/40 to-twitch-card border border-twitch-purple/30 p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 bg-twitch-purple/20 border border-twitch-purple/40 text-twitch-purple px-3 py-1 rounded-full text-xs font-semibold">
              <Cloud className="w-3.5 h-3.5" />
              <span>En vivo y a tu ritmo</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Comparte lo que te apasiona, en vivo
            </h1>

            <p className="text-sm text-twitch-muted leading-relaxed">
              Descubre creadores, conversa con su comunidad y vuelve a ver tus transmisiones favoritas.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to={`/${featuredStream.username}`}
                className="bg-twitch-purple hover:bg-twitch-darkPurple text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-lg shadow-twitch-purple/30 flex items-center space-x-2"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Ver Canal Destacado (@{featuredStream.username})</span>
              </Link>

              <Link
                to="/studio"
                className="bg-twitch-card hover:bg-twitch-hover border border-twitch-border text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2"
              >
                <Video className="w-4 h-4 text-twitch-purple" />
                <span>Iniciar Transmisión</span>
              </Link>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-twitch-purple/10 to-transparent pointer-events-none hidden md:block"></div>
        </div>
      )}

      <h1 className="text-xl font-bold">{followingOnly ? 'Canales que sigues' : 'Explorar canales'}</h1>
      {/* Category Pills Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-twitch-border/40 scrollbar-none">
        <Filter className="w-4 h-4 text-twitch-muted mr-1 flex-shrink-0" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex-shrink-0 ${
              selectedCategory === cat
                ? 'bg-twitch-purple text-white shadow-md shadow-twitch-purple/20'
                : 'bg-twitch-card text-twitch-muted hover:text-white hover:bg-twitch-hover border border-twitch-border/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-twitch-muted">Cargando canales en la nube...</p>
        </div>
      )}

      {/* Live Channels Section */}
      {!loading && liveChannels.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <h2 className="text-lg font-bold text-white tracking-tight">Canales en Vivo Ahora</h2>
            <span className="text-xs bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
              {liveChannels.length} activos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {liveChannels.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        </div>
      )}

      {/* Offline / All Channels Section */}
      {!loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Todos los Canales de la Red'}
            </h2>
            <span className="text-xs text-twitch-muted font-medium">
              {filteredChannels.length} canal(es) encontrados
            </span>
          </div>

          {filteredChannels.length === 0 ? (
            <div className="text-center py-16 bg-twitch-card/40 rounded-xl border border-twitch-border/40 p-8">
              <p className="text-sm font-semibold text-white mb-1">No se encontraron canales</p>
              <p className="text-xs text-twitch-muted">Prueba con otra búsqueda o crea tu canal en el Panel de Control.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredChannels.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
