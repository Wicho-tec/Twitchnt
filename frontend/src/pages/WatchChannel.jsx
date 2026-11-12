import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Heart, 
  Share2, 
  Radio, 
  Check, 
  PlayCircle, 
  StopCircle,
  Tag,
  AlertCircle
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { copyText } from '../services/clipboard';

export default function WatchChannel() {
  const { username } = useParams();
  const { user, setIsAuthModalOpen } = useAuth();
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [vod, setVod] = useState(null);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    setVod(null);
    setFollowing(false);
    if (user) api.get('/following').then(res => setFollowing(res.data.some(c => c.username === username))).catch(() => {});
  }, [username, user]);

  useEffect(() => {
    async function fetchChannel() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/channels/${username}`);
        setChannel(res.data);
      } catch (err) {
        console.error('Error fetching channel:', err);
        setError('El canal no existe o no se pudo cargar.');
      } finally {
        setLoading(false);
      }
    }
    fetchChannel();

    // Poll channel status every 6 seconds to detect when stream starts or stops
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/channels/${username}`);
        setChannel(res.data);
      } catch (e) {
        // quiet poll
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [username]);

  const handleShare = async () => {
    try { await copyText(window.location.href); }
    catch (err) { setActionError(err.message); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollow = async () => {
    if (!user) return setIsAuthModalOpen(true);
    setFollowBusy(true);
    setActionError('');
    try {
      const { data } = await api.post(`/channels/${username}/follow`);
      setFollowing(data.following);
      setChannel(prev => ({ ...prev, followers: data.followers }));
    } catch (err) { setActionError(err.response?.data?.error || 'No se pudo actualizar el seguimiento'); }
    finally { setFollowBusy(false); }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-twitch-purple border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-twitch-muted">Conectando al canal de {username}...</p>
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div className="max-w-md bg-twitch-card border border-twitch-border p-8 rounded-xl space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Canal no encontrado</h2>
          <p className="text-xs text-twitch-muted">{error || 'No pudimos encontrar este canal en el clúster.'}</p>
          <Link
            to="/"
            className="inline-block bg-twitch-purple hover:bg-twitch-darkPurple text-white px-4 py-2 rounded-lg text-xs font-bold transition"
          >
            Volver a Explorar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Stream & Details Area */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Video Player */}
        {vod ? (
          <div className="space-y-2">
            <video key={vod.url} src={vod.url} controls autoPlay playsInline className="w-full aspect-video bg-black rounded-xl" aria-label={`Grabación ${vod.name}`} />
            <button onClick={() => setVod(null)} className="px-4 py-3 bg-twitch-purple rounded-lg">Volver al canal</button>
          </div>
        ) : <VideoPlayer streamUrl={channel.streamUrl} isLive={channel.isLive} channelName={channel.displayName || channel.username} avatar={channel.avatar} />}


        {/* Stream Details & Actions Bar */}
        <div className="bg-twitch-card border border-twitch-border rounded-xl p-4 md:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Channel Info */}
          <div className="flex items-start space-x-3.5">
            <div className="relative">
              <img
                src={channel.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.username}`}
                alt={channel.displayName}
                className={`w-14 h-14 rounded-full object-cover border-2 ${
                  channel.isLive ? 'border-red-500' : 'border-twitch-border'
                }`}
              />
              {channel.isLive && (
                <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase border border-twitch-card animate-pulse">
                  LIVE
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 break-all">
                <h1 className="text-base md:text-lg font-bold text-white">
                  {channel.displayName || channel.username}
                </h1>
                <span className="text-xs text-twitch-muted">@{channel.username}</span>
              </div>

              <h2 className="text-xs md:text-sm text-twitch-text font-medium leading-snug">
                {channel.title}
              </h2>

              <div className="flex items-center space-x-2 pt-0.5">
                <span className="inline-flex items-center text-[11px] font-semibold bg-twitch-purple/20 text-twitch-purple border border-twitch-purple/30 px-2.5 py-0.5 rounded-full">
                  <Tag className="w-3 h-3 mr-1" />
                  {channel.category}
                </span>

                {channel.isLive && (
                  <span className="text-xs font-mono text-red-400 font-bold flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>{channel.viewerCount || 0} espectadores</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {user?.username !== channel.username && <button onClick={handleFollow} disabled={followBusy} aria-pressed={following} className="flex items-center gap-2 px-4 py-3 rounded-lg bg-twitch-purple disabled:opacity-50">
              <Heart className="w-4 h-4" />{following ? 'Siguiendo' : 'Seguir'}
            </button>}
            <span className="text-xs">{channel.followers || 0} seguidores</span>
            {actionError && <p role="alert" className="text-red-400 text-xs">{actionError}</p>}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 bg-twitch-hover hover:bg-twitch-border text-twitch-text px-3 py-2 rounded-lg text-xs font-semibold border border-twitch-border transition"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? '¡Enlace copiado!' : 'Compartir'}</span>
            </button>
          </div>
        </div>

        {/* Channel About & Bio */}
        <div className="bg-twitch-card border border-twitch-border rounded-xl p-5 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-twitch-muted">
            Acerca de {channel.displayName || channel.username}
          </h3>
          <p className="text-xs text-twitch-text leading-relaxed">
            {channel.description || channel.bio || 'Este creador aún no ha agregado una biografía.'}
          </p>
        </div>
        <section className="bg-twitch-card border border-twitch-border rounded-xl p-5 space-y-3" aria-label="Videos anteriores">
          <h3 className="font-bold">Videos anteriores</h3>
          {channel.vods?.length ? channel.vods.map(item => <button key={item.url} onClick={() => setVod(item)} className="block w-full text-left p-3 rounded-lg bg-twitch-bg hover:bg-twitch-hover">
            {item.name} <span className="text-twitch-muted">({item.size_mb} MB)</span>
          </button>) : <p className="text-sm text-twitch-muted">Aún no hay transmisiones grabadas.</p>}
        </section>
      </div>

      {/* Live Chat Panel */}
      <ChatBox channelUsername={channel.username} />
    </div>
  );
}
