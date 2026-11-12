import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Save, 
  Radio, 
  Settings, 
  Video, 
  Tv, 
  AlertTriangle,
  PlayCircle,
  StopCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import api from '../services/api';

export default function Studio() {
  const { user, channel, refreshChannel, setIsAuthModalOpen } = useAuth();
  const [streamKey, setStreamKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  // Stream metadata form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Software & Game Development');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const navigate = useNavigate();

  // RTMP URL based on current host and environment
  const rtmpUrl = `rtmp://${window.location.hostname}:${import.meta.env.VITE_RTMP_PORT || '1935'}/live`;
  const obsKey = `${user?.username}?key=${streamKey}`;

  useEffect(() => {
    if (!user) return;

    async function loadStudioData() {
      try {
        const res = await api.get(`/channels/${user.username}`);
        setTitle(res.data.title || '');
        setDescription(res.data.description || '');
        setCategory(res.data.category || 'Software & Game Development');
        
        // Fetch private channel info (with streamKey)
        const meRes = await api.get('/auth/me');
        if (meRes.data.channel?.streamKey) {
          setStreamKey(meRes.data.channel.streamKey);
        }
      } catch (err) {
        console.error('Error loading studio data:', err);
      }
    }
    loadStudioData();
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div className="max-w-md bg-twitch-card border border-twitch-border p-8 rounded-xl space-y-4">
          <Settings className="w-12 h-12 text-twitch-purple mx-auto animate-spin" />
          <h2 className="text-lg font-bold text-white">Panel de Creador (Studio)</h2>
          <p className="text-xs text-twitch-muted">
            Debes iniciar sesión con tu cuenta para acceder a la configuración de tu canal y tus claves de emisión.
          </p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-twitch-purple hover:bg-twitch-darkPurple text-white px-5 py-2 rounded-lg text-xs font-bold transition"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(obsKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(rtmpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('¿Seguro que deseas generar una nueva clave de transmisión? La clave anterior dejará de funcionar en OBS inmediatamente.')) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await api.post(`/channels/${user.username}/regenerate-key`);
      setStreamKey(res.data.streamKey);
      await refreshChannel();
    } catch (err) {
      console.error('Error regenerating stream key:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveMetadata = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.put(`/channels/${user.username}`, {
        title,
        description,
        category
      });
      setSaveSuccess(true);
      await refreshChannel();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving channel metadata:', err);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-6xl mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-twitch-border gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Panel de Control del Creador (Studio)
            </h1>
            <span className="text-xs bg-twitch-purple/20 text-twitch-purple border border-twitch-purple/30 px-2 py-0.5 rounded-full font-semibold">
              @{user.username}
            </span>
          </div>
          <p className="text-xs text-twitch-muted mt-1">
            Configura los parámetros de OBS Studio, actualiza el título y administra tu clave de transmisión.
          </p>
        </div>

        <div className="flex items-center space-x-3">

          <button
            onClick={() => navigate(`/${user.username}`)}
            className="flex items-center space-x-1.5 bg-twitch-card hover:bg-twitch-hover text-white border border-twitch-border px-3 py-2 rounded-lg text-xs font-bold transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver mi Canal</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: OBS & Stream Keys Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stream Credentials Card */}
          <div className="bg-twitch-card border border-twitch-border rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-twitch-border pb-3">
              <Key className="w-5 h-5 text-twitch-purple" />
              <h2 className="text-sm font-bold text-white">Credenciales de Emisión (OBS Studio)</h2>
            </div>

            <div className="space-y-4">
              {/* Server URL */}
              <div>
                <label className="block text-xs font-semibold text-twitch-text mb-1">
                  URL del servidor RTMP
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={rtmpUrl}
                    className="flex-1 bg-twitch-bg border border-twitch-border rounded-lg px-3 py-2 text-xs font-mono text-twitch-text focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="bg-twitch-hover hover:bg-twitch-border border border-twitch-border text-twitch-text px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-twitch-muted mt-1">
                  En OBS Studio: Ajustes &gt; Emisión &gt; Servicio: <strong>Personalizado...</strong> &gt; Servidor: <code>{rtmpUrl}</code>
                </p>
              </div>

              {/* Stream Key */}
              <div>
                <label className="block text-xs font-semibold text-twitch-text mb-1">
                  Clave de Transmisión Principal (Privada)
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      readOnly
                      value={streamKey ? obsKey : 'Cargando clave...'}
                      className="w-full bg-twitch-bg border border-twitch-border rounded-lg px-3 py-2 text-xs font-mono text-twitch-text focus:outline-none pr-10 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-2.5 text-twitch-muted hover:text-white transition"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={handleCopyKey}
                    className="bg-twitch-purple hover:bg-twitch-darkPurple text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
                  </button>

                  <button
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    className="bg-twitch-hover hover:bg-twitch-border border border-twitch-border text-twitch-muted hover:text-white px-3 py-2 rounded-lg text-xs transition"
                    title="Regenerar clave"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 p-2.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    No compartas tu clave de transmisión con nadie. Quien tenga esta clave puede emitir directamente en tu canal.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Metadata Form */}
          <div className="bg-twitch-card border border-twitch-border rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-twitch-border pb-3">
              <Settings className="w-5 h-5 text-twitch-purple" />
              <h2 className="text-sm font-bold text-white">Editar Información de la Transmisión</h2>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              {saveSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs p-2.5 rounded-lg font-medium">
                  ✓ Información de la transmisión guardada con éxito.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-twitch-text mb-1">
                  Título de la Transmisión
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. 🔴 Programando arquitectura de microservicios con Kubernetes"
                  className="w-full bg-twitch-bg border border-twitch-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-twitch-purple transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitch-text mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-twitch-bg border border-twitch-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-twitch-purple transition"
                >
                  <option value="Software & Game Development">Software & Game Development</option>
                  <option value="Cómputo en la Nube">Cómputo en la Nube</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Just Chatting">Just Chatting</option>
                  <option value="Música">Música</option>
                  <option value="Tecnología & Ciencia">Tecnología & Ciencia</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-semibold mb-1">Descripción del canal</label>
                <textarea id="description" value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} className="w-full bg-twitch-bg border border-twitch-border rounded-lg p-3 text-sm" />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-twitch-purple hover:bg-twitch-darkPurple disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition flex items-center space-x-2 shadow-md shadow-twitch-purple/20"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando cambios...' : 'Guardar Cambios'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Stream Monitor & Instructions */}
        <div className="space-y-6">
          {/* Live Monitor Preview */}
          <div className="bg-twitch-card border border-twitch-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <Video className="w-4 h-4 text-twitch-purple" />
                <span>Monitor de Vista Previa</span>
              </h2>
              {channel?.isLive ? (
                <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                  EN VIVO
                </span>
              ) : (
                <span className="text-[10px] bg-twitch-bg text-twitch-muted font-bold px-2 py-0.5 rounded-full uppercase border border-twitch-border">
                  OFFLINE
                </span>
              )}
            </div>

            <VideoPlayer
              streamUrl={`/hls/live/${user.username}/index.m3u8`}
              isLive={channel?.isLive}
              channelName={user.displayName}
              avatar={user.avatar}
            />
          </div>

          {/* Quick Guide Card */}
          <div className="bg-twitch-card border border-twitch-border rounded-xl p-5 space-y-3 text-xs">
            <h3 className="font-bold text-white flex items-center space-x-1.5">
              <Tv className="w-4 h-4 text-twitch-purple" />
              <span>Cómo transmitir con OBS Studio</span>
            </h3>

            <ol className="list-decimal list-inside space-y-2 text-twitch-muted leading-relaxed">
              <li>Abre <strong>OBS Studio</strong> en tu computadora.</li>
              <li>Ve a <strong>Ajustes &gt; Emisión</strong>.</li>
              <li>En <em>Servicio</em> selecciona <strong>Personalizado...</strong></li>
              <li>Pega el <strong>Servidor</strong> copiado arriba (<code>{rtmpUrl}</code>).</li>
              <li>Pega tu <strong>Clave de transmisión</strong>.</li>
              <li>Haz clic en <strong>Iniciar transmisión</strong> en OBS. ¡Tu stream aparecerá aquí automáticamente!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
