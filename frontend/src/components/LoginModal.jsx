import React, { useState } from 'react';
import { X, Radio, User, Mail, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register({ username, displayName, email, password });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickUsername) => {
    setError('');
    setLoading(true);
    try {
      await login(quickUsername, 'password123');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar con cuenta de prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-twitch-card border border-twitch-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-3.5 right-3.5 text-twitch-muted hover:text-white p-1 rounded-md hover:bg-twitch-hover transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-twitch-border text-center">
          <div className="inline-flex items-center space-x-2 text-twitch-purple mb-2">
            <Radio className="w-6 h-6 animate-pulse" />
            <span className="text-xl font-bold text-white">Twitchnt</span>
          </div>
          <p className="text-xs text-twitch-muted">
            {tab === 'login' ? 'Conéctate a tu cuenta para chatear y transmitir' : 'Crea tu canal en la nube en segundos'}
          </p>

          {/* Tabs */}
          <div className="flex border-b border-twitch-border mt-4 -mb-4">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
                tab === 'login' ? 'border-twitch-purple text-twitch-purple' : 'border-transparent text-twitch-muted hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
                tab === 'register' ? 'border-twitch-purple text-twitch-purple' : 'border-transparent text-twitch-muted hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>
        </div>

        {/* Quick Demo Login */}
        <div className="bg-twitch-bg/60 p-4 border-b border-twitch-border">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-twitch-muted mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Acceso rápido con cuentas de prueba:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('cloud_streamer')}
              className="text-[11px] bg-twitch-hover hover:bg-twitch-purple hover:text-white text-twitch-text py-1.5 px-2 rounded border border-twitch-border transition truncate"
            >
              cloud_streamer
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('tecnm_gaming')}
              className="text-[11px] bg-twitch-hover hover:bg-twitch-purple hover:text-white text-twitch-text py-1.5 px-2 rounded border border-twitch-border transition truncate"
            >
              tecnm_gaming
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('chill_coder')}
              className="text-[11px] bg-twitch-hover hover:bg-twitch-purple hover:text-white text-twitch-text py-1.5 px-2 rounded border border-twitch-border transition truncate"
            >
              chill_coder
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2.5 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-twitch-text mb-1">Nombre de Usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-twitch-muted absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="ej. cloud_streamer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-twitch-bg border border-twitch-border rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-twitch-purple transition"
              />
            </div>
          </div>

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-twitch-text mb-1">Nombre Visible</label>
                <input
                  type="text"
                  placeholder="ej. Mi Canal de Streaming"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-twitch-bg border border-twitch-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-twitch-purple transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitch-text mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-twitch-muted absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-twitch-bg border border-twitch-border rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-twitch-purple transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-twitch-text mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-twitch-muted absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-twitch-bg border border-twitch-border rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-twitch-purple transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-twitch-purple hover:bg-twitch-darkPurple disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-twitch-purple/20 mt-4"
          >
            {loading ? 'Procesando...' : tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
