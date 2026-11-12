import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw,
  Radio,
  Tv,
  Activity,
  Cast
} from 'lucide-react';

export default function VideoPlayer({ streamUrl, isLive, channelName, avatar, onLiveDetected }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasRealVideo, setHasRealVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    setHasRealVideo(false);
    if (!isLive) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Try loading HLS stream (actively listens for OBS signal)
    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: Infinity,
        manifestLoadingRetryDelay: 1500
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setHasRealVideo(true);
        if (onLiveDetected) onLiveDetected();
        video.play().then(() => setIsPlaying(true)).catch(() => {
          // Autoplay with audio was blocked by browser
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Silently retry loading stream in the background
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.loadSource(streamUrl);
                  hlsRef.current.startLoad();
                }
              }, 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.loadSource(streamUrl);
                  hlsRef.current.startLoad();
                }
              }, 2000);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setHasRealVideo(true);
        if (onLiveDetected) onLiveDetected();
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, isLive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !videoRef.current.muted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group select-none shadow-2xl rounded-lg"
    >
      {/* Real Video Element (shown when OBS is actively broadcasting) */}
      <video
        ref={videoRef}
        className={`w-full h-full object-contain ${hasRealVideo ? 'block' : 'hidden'}`}
        playsInline
        onClick={togglePlay}
      />

      {/* Screen 1: Live Simulation / Waiting for OBS Feed */}
      {isLive && !hasRealVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-950/60 via-twitch-card to-black p-6 text-center animate-in fade-in duration-300">
          <div className="relative mb-3">
            <img
              src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${channelName}`}
              alt={channelName}
              className="w-20 h-20 rounded-full border-4 border-red-500 shadow-2xl ring-4 ring-red-500/30 animate-pulse"
            />
            <span className="absolute -bottom-1 -right-1 bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
              EN VIVO
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1 flex items-center space-x-2 justify-center">
            <span>🔴 Canal en Directo: {channelName}</span>
          </h3>

          <p className="text-xs text-twitch-muted max-w-md mb-4 leading-relaxed">
            La emisión está activa. El chat y los espectadores están sincronizados en tiempo real.
          </p>

          <p className="text-sm text-twitch-muted">Preparando el vídeo en vivo…</p>
        </div>
      )}

      {/* Screen 2: Channel Offline */}
      {!isLive && !hasRealVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-twitch-card to-black p-6 text-center">
          <div className="relative mb-4">
            <img
              src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${channelName}`}
              alt={channelName}
              className="w-20 h-20 rounded-full border-4 border-twitch-border/60 shadow-xl opacity-80"
            />
            <div className="absolute -bottom-1 -right-1 bg-twitch-border text-twitch-muted p-1 rounded-full border-2 border-black">
              <Tv className="w-4 h-4" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">
            {channelName} no está transmitiendo ahora
          </h3>
          <p className="text-sm text-twitch-muted max-w-md mb-5">
            El canal está desconectado. Puedes ver sus vídeos anteriores mientras esperas la próxima emisión.
          </p>

          <div className="flex items-center space-x-2 text-xs bg-twitch-hover border border-twitch-border px-3.5 py-1.5 rounded-full text-twitch-text">
            <Radio className="w-3.5 h-3.5 text-twitch-muted animate-pulse" />
            <span>Esperando señal RTMP en el puerto 1935...</span>
          </div>
        </div>
      )}



      {/* Live Badge in top left */}
      {(isLive || hasRealVideo) && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 z-20">
          <span className="bg-red-600 text-white font-bold text-xs uppercase px-2.5 py-0.5 rounded shadow tracking-wider animate-pulse flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
            <span>EN VIVO</span>
          </span>
        </div>
      )}

      {/* Bottom Overlay Controls (when video is actively playing) */}
      {hasRealVideo && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between text-white z-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlay}
              className="hover:text-twitch-purple transition p-1"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="hover:text-twitch-purple transition p-1"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/40 rounded-lg appearance-none cursor-pointer accent-twitch-purple"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleFullscreen}
              className="hover:text-twitch-purple transition p-1"
              title="Pantalla completa"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
