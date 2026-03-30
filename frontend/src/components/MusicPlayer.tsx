/**
 * MusicPlayer — Persistent floating background music player for the GM.
 *
 * Features:
 *   • Browse tracks by tag (combat, exploration, tavern, etc.)
 *   • Play / pause / skip / loop
 *   • Volume control (persisted)
 *   • Add custom tracks via URL
 *   • Minimised mode (small floating pill) and expanded panel
 *   • Persists across page transitions (lives in App.tsx)
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  type MusicTrack,
  type MusicTag,
  MUSIC_TAG_META,
  ALL_MUSIC_TAGS,
  getAllTracks,
  loadCustomTracks,
  saveCustomTracks,
  loadVolume,
  saveVolume,
} from '../services/musicCatalog';
import './MusicPlayer.css';

// ─── Helpers ────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────

export const MusicPlayer: React.FC = () => {
  // ── State ──
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [volume, setVolume] = useState(loadVolume);
  const [looping, setLooping] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTag, setActiveTag] = useState<MusicTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>(loadCustomTracks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addTags, setAddTags] = useState<MusicTag[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Track we want to play once audio is ready */
  const pendingPlayRef = useRef<string | null>(null);

  // ── All tracks including custom ──
  const allTracks = useMemo(() => getAllTracks(), [customTracks]);

  // ── Filtered tracks ──
  const filteredTracks = useMemo(() => {
    let tracks = allTracks;
    if (activeTag) {
      tracks = tracks.filter(t => t.tags.includes(activeTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tracks = tracks.filter(
        t => t.title.toLowerCase().includes(q)
          || t.artist.toLowerCase().includes(q)
          || t.tags.some(tag => tag.includes(q))
      );
    }
    return tracks;
  }, [allTracks, activeTag, searchQuery]);

  // ── Audio element setup ──
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.loop = looping;
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    // When enough data is buffered, start playback if pending
    audio.addEventListener('canplaythrough', () => {
      setLoading(false);
      if (pendingPlayRef.current && audio.src) {
        pendingPlayRef.current = null;
        audio.play().then(() => {
          setPlaying(true);
        }).catch((err) => {
          console.warn('Music play rejected:', err?.name, err?.message);
          if (err?.name === 'NotAllowedError') {
            setLoadError('Autoplay blocked — click ▶ to start playback.');
          }
          setPlaying(false);
        });
      }
    });
    audio.addEventListener('ended', () => {
      if (!audio.loop) {
        // Auto-play next track
        handleNext();
      }
    });
    audio.addEventListener('error', () => {
      setLoading(false);
      pendingPlayRef.current = null;
      const code = audio.error?.code;
      if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        setLoadError('Audio format not supported or URL is invalid.');
      } else if (code === MediaError.MEDIA_ERR_NETWORK) {
        setLoadError('Network error — could not fetch the audio file. The URL may have expired.');
      } else {
        setLoadError('Failed to load track. URL may be invalid or blocked by CORS.');
      }
      setPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
      pendingPlayRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync volume ──
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    saveVolume(volume);
  }, [volume]);

  // ── Sync loop ──
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = looping;
    }
  }, [looping]);

  // ── Play a track ──
  const playTrack = useCallback((track: MusicTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    setLoadError(null);

    if (currentTrack?.id === track.id && !audio.paused) {
      // Already playing this track — pause
      audio.pause();
      setPlaying(false);
      return;
    }

    if (currentTrack?.id === track.id && audio.paused) {
      // Same track, resume
      audio.play().then(() => {
        setPlaying(true);
      }).catch((err) => {
        console.warn('Resume rejected:', err?.name);
        if (err?.name === 'NotAllowedError') {
          setLoadError('Autoplay blocked — click ▶ to start playback.');
        }
      });
      return;
    }

    // New track — load first, play when canplaythrough fires
    setLoading(true);
    pendingPlayRef.current = track.id;
    audio.src = track.url;
    audio.load();
    setCurrentTrack(track);
    setPlaying(false); // will flip to true once canplaythrough fires
    setCurrentTime(0);
    setDuration(track.duration || 0);
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    setLoadError(null);

    if (audio.paused) {
      audio.play().then(() => {
        setPlaying(true);
      }).catch((err) => {
        console.warn('Play rejected:', err?.name, err?.message);
        if (err?.name === 'NotAllowedError') {
          setLoadError('Autoplay blocked — interact with the page first, then press play.');
        } else {
          setLoadError(`Playback error: ${err?.message || 'unknown'}`);
        }
      });
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [currentTrack]);

  const handleNext = useCallback(() => {
    const list = filteredTracks.length > 0 ? filteredTracks : allTracks;
    if (list.length === 0) return;
    const idx = currentTrack ? list.findIndex(t => t.id === currentTrack.id) : -1;
    const next = list[(idx + 1) % list.length];
    playTrack(next);
  }, [filteredTracks, allTracks, currentTrack, playTrack]);

  const handlePrev = useCallback(() => {
    const list = filteredTracks.length > 0 ? filteredTracks : allTracks;
    if (list.length === 0) return;
    const idx = currentTrack ? list.findIndex(t => t.id === currentTrack.id) : 0;
    const prev = list[(idx - 1 + list.length) % list.length];
    playTrack(prev);
  }, [filteredTracks, allTracks, currentTrack, playTrack]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current && isFinite(time)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setCurrentTime(0);
  }, []);

  // ── Add Custom Track ──
  const handleAddCustom = () => {
    if (!addTitle.trim() || !addUrl.trim()) return;
    const newTrack: MusicTrack = {
      id: 'custom_' + Date.now(),
      title: addTitle.trim(),
      artist: 'Custom',
      tags: addTags.length > 0 ? addTags : ['exploration'],
      url: addUrl.trim(),
      duration: 0,
      custom: true,
    };
    const updated = [...customTracks, newTrack];
    setCustomTracks(updated);
    saveCustomTracks(updated);
    setAddTitle('');
    setAddUrl('');
    setAddTags([]);
    setShowAddForm(false);
  };

  const handleRemoveCustom = (trackId: string) => {
    const updated = customTracks.filter(t => t.id !== trackId);
    setCustomTracks(updated);
    saveCustomTracks(updated);
    if (currentTrack?.id === trackId) {
      stop();
      setCurrentTrack(null);
    }
  };

  const toggleAddTag = (tag: MusicTag) => {
    setAddTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // ── Minimised Pill ──
  if (!expanded) {
    return (
      <div className="music-player-pill" onClick={() => setExpanded(true)}>
        <span className="pill-icon">{playing ? '🎵' : '🎶'}</span>
        {currentTrack ? (
          <span className="pill-info">
            <span className={`pill-title ${playing ? 'playing' : ''}`}>{currentTrack.title}</span>
            <button
              className="pill-btn"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? '⏸' : '▶'}
            </button>
          </span>
        ) : (
          <span className="pill-title idle">Music Player</span>
        )}
      </div>
    );
  }

  // ── Expanded Panel ──
  return (
    <div className="music-player-panel">
      {/* ─── Header ─── */}
      <div className="mp-header">
        <span className="mp-header-title">🎶 Music Player</span>
        <button className="mp-close" onClick={() => setExpanded(false)} title="Minimise">─</button>
      </div>

      {/* ─── Now Playing ─── */}
      <div className="mp-now-playing">
        {currentTrack ? (
          <>
            <div className="np-info">
              <span className={`np-title ${playing ? 'np-playing' : ''}`}>{currentTrack.title}</span>
              <span className="np-artist">{currentTrack.artist}</span>
            </div>
            <div className="np-tags">
              {currentTrack.tags.map(tag => (
                <span key={tag} className="np-tag" style={{ borderColor: MUSIC_TAG_META[tag].color }}>
                  {MUSIC_TAG_META[tag].icon}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="np-info">
            <span className="np-title idle">No track selected</span>
            <span className="np-artist">Browse tracks below</span>
          </div>
        )}
      </div>

      {/* ─── Progress bar ─── */}
      <div className="mp-progress">
        <span className="mp-time">{formatTime(currentTime)}</span>
        <input
          type="range"
          className="mp-seek"
          min={0}
          max={duration || 1}
          step={0.5}
          value={currentTime}
          onChange={handleSeek}
        />
        <span className="mp-time">{formatTime(duration)}</span>
      </div>

      {/* ─── Controls ─── */}
      <div className="mp-controls">
        <button className="mp-ctrl" onClick={handlePrev} title="Previous">⏮</button>
        <button className="mp-ctrl mp-play" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="mp-ctrl" onClick={handleNext} title="Next">⏭</button>
        <button className="mp-ctrl" onClick={stop} title="Stop">⏹</button>
        <button
          className={`mp-ctrl ${looping ? 'active' : ''}`}
          onClick={() => setLooping(!looping)}
          title={looping ? 'Looping ON' : 'Looping OFF'}
        >
          🔁
        </button>
        <div className="mp-volume">
          <span className="vol-icon">{volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : '🔊'}</span>
          <input
            type="range"
            className="mp-vol-slider"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {loading && <div className="mp-loading">⏳ Loading track...</div>}
      {loadError && <div className="mp-error">{loadError}</div>}

      {/* ─── Tag Filters ─── */}
      <div className="mp-tags">
        <button
          className={`mp-tag-btn ${activeTag === null ? 'active' : ''}`}
          onClick={() => setActiveTag(null)}
        >
          All
        </button>
        {ALL_MUSIC_TAGS.map(tag => (
          <button
            key={tag}
            className={`mp-tag-btn ${activeTag === tag ? 'active' : ''}`}
            style={activeTag === tag ? { borderColor: MUSIC_TAG_META[tag].color, color: MUSIC_TAG_META[tag].color } : {}}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
          >
            {MUSIC_TAG_META[tag].icon} {MUSIC_TAG_META[tag].label}
          </button>
        ))}
      </div>

      {/* ─── Search ─── */}
      <input
        className="mp-search"
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search tracks..."
      />

      {/* ─── Track List ─── */}
      <div className="mp-tracklist">
        {filteredTracks.length === 0 ? (
          <div className="mp-no-tracks">No tracks match your filter.</div>
        ) : (
          filteredTracks.map(track => (
            <div
              key={track.id}
              className={`mp-track-row ${currentTrack?.id === track.id ? 'mp-active-track' : ''}`}
              onClick={() => playTrack(track)}
            >
              <span className="track-play-indicator">
                {currentTrack?.id === track.id && playing ? '▶' : ''}
              </span>
              <div className="track-info">
                <span className="track-title">{track.title}</span>
                <span className="track-meta">
                  {track.artist}
                  {track.duration > 0 && ` • ${formatTime(track.duration)}`}
                </span>
              </div>
              <div className="track-tags">
                {track.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="track-tag-dot"
                    style={{ background: MUSIC_TAG_META[tag]?.color || '#666' }}
                    title={MUSIC_TAG_META[tag]?.label || tag}
                  />
                ))}
              </div>
              {track.custom && (
                <button
                  className="track-remove"
                  onClick={(e) => { e.stopPropagation(); handleRemoveCustom(track.id); }}
                  title="Remove custom track"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── Add Custom Track ─── */}
      <div className="mp-add-section">
        {!showAddForm ? (
          <button className="mp-add-btn" onClick={() => setShowAddForm(true)}>
            + Add Custom Track
          </button>
        ) : (
          <div className="mp-add-form">
            <input
              className="mp-add-input"
              type="text"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              placeholder="Track title"
            />
            <input
              className="mp-add-input"
              type="text"
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              placeholder="Audio URL (https://... or /music/file.mp3)"
            />
            <div className="mp-add-tags">
              {ALL_MUSIC_TAGS.map(tag => (
                <button
                  key={tag}
                  className={`mp-add-tag ${addTags.includes(tag) ? 'selected' : ''}`}
                  style={addTags.includes(tag) ? { borderColor: MUSIC_TAG_META[tag].color, color: MUSIC_TAG_META[tag].color } : {}}
                  onClick={() => toggleAddTag(tag)}
                >
                  {MUSIC_TAG_META[tag].icon}
                </button>
              ))}
            </div>
            <div className="mp-add-actions">
              <button className="mp-add-confirm" onClick={handleAddCustom}>Add</button>
              <button className="mp-add-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPlayer;
