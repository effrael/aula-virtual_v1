"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Loader2,
} from "lucide-react";

function fmt(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  hlsUrl: string;
  lessonId: string;
  onComplete: () => void;
}

export function VideoPlayer({ hlsUrl, lessonId, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const doneRef     = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [loading,   setLoading]   = useState(true);
  const [playing,   setPlaying]   = useState(false);
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [muted,     setMuted]     = useState(false);
  const [controls,  setControls]  = useState(true);
  const [speed,     setSpeed]     = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // ── Inicializar HLS ────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    doneRef.current = false;
    setLoading(true);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) console.error("[VideoPlayer]", d); });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => setLoading(false), { once: true });
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsUrl, lessonId]);

  // ── Auto-ocultar controles ─────────────────────────────────────────────────
  function showControls() {
    setControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setControls(false), 2800);
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function changeSpeed(s: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
  }

  function toggleFullscreen() {
    const c = containerRef.current;
    if (!c) return;
    document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen();
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    const bar = progressBarRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (!doneRef.current && v.duration > 0 && v.currentTime / v.duration >= 0.95) {
      doneRef.current = true;
      onComplete();
    }
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden bg-neutral-900 aspect-video select-none"
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={() => setControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Video — sin controles nativos, sin descarga, sin PiP */}
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        disablePictureInPicture
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (!doneRef.current) { doneRef.current = true; onComplete(); }
        }}
      />

      {/* Spinner de carga */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="size-9 text-white/30 animate-spin" />
        </div>
      )}

      {/* Botón central de play (cuando está pausado) */}
      {!loading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {!playing && (
            <span className="flex items-center justify-center size-16 rounded-full bg-primary text-white shadow-xl hover:scale-105 transition-transform">
              <Play className="size-7 ml-1" fill="white" />
            </span>
          )}
        </button>
      )}

      {/* Barra de controles */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col gap-2 px-4 pt-6 pb-3
          bg-gradient-to-t from-black/75 to-transparent
          transition-opacity duration-300
          ${controls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Barra de progreso */}
        <div
          ref={progressBarRef}
          className="group/bar h-1 hover:h-2 rounded-full bg-white/20 cursor-pointer transition-all duration-150 relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${pct}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>

        {/* Fila de botones */}
        <div className="flex items-center gap-3 text-white">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="hover:text-primary transition-colors shrink-0 cursor-pointer"
            aria-label={playing ? "Pausar" : "Reproducir"}
          >
            {playing
              ? <Pause  className="size-4" fill="white" />
              : <Play   className="size-4 ml-px" fill="white" />
            }
          </button>

          {/* Tiempo actual */}
          <span className="text-xs tabular-nums text-white/90">{fmt(current)}</span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Duración total */}
          <span className="text-xs tabular-nums text-white/50">{fmt(duration)}</span>

          {/* Volumen */}
          <button
            onClick={toggleMute}
            className="hover:text-primary transition-colors shrink-0 cursor-pointer"
            aria-label={muted ? "Activar sonido" : "Silenciar"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          {/* Velocidad */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSpeedOpen((o) => !o)}
              className="text-xs font-semibold tabular-nums hover:text-primary transition-colors min-w-[2.5rem] text-center cursor-pointer"
            >
              {speed === 1 ? "1x" : `${speed}x`}
            </button>
            {speedOpen && (
              <div className="absolute bottom-full mb-2 right-0 bg-neutral-800 rounded-lg overflow-hidden shadow-xl border border-white/10 z-10">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`block w-full px-4 py-1.5 text-xs text-left hover:bg-white/10 transition-colors cursor-pointer ${
                      s === speed ? "text-primary font-semibold" : "text-white"
                    }`}
                  >
                    {s === 1 ? "Normal" : `${s}x`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pantalla completa */}
          <button
            onClick={toggleFullscreen}
            className="hover:text-primary transition-colors shrink-0 cursor-pointer"
            aria-label="Pantalla completa"
          >
            <Maximize className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
