import React, { useEffect, useRef, useState } from 'react';
import {
  X, Star, Shield, Clock, Info, Heart, Tv, Calendar,
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  RotateCcw, RotateCw
} from 'lucide-react';
import { readPlayerPrefs, writePlayerPrefs, writeProgress } from '../utils/storage';

const PROGRESS_SAVE_INTERVAL = 5000; // ms
const RESUME_THRESHOLD = 10; // seconds of remaining time that counts as "finished"

export default function VideoModal({ cartoon, onClose, isFav, onToggleFav, resumeAt = 0, onProgressSave }) {
  const modalRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const wrapperRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Custom player states
  // Flaw fix F12: isPlaying is mirrored from real media events (play/pause),
  // never set optimistically before playback actually starts.
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Flaw fix F24: volume/mute persist across sessions
  const prefs = readPlayerPrefs();
  const [volume, setVolume] = useState(prefs.volume);
  const [isMuted, setIsMuted] = useState(prefs.isMuted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  // Flaw fix F12: user-visible error state with retry
  const [mediaError, setMediaError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // General-catalog entries lack season/episode/talisman — branch the UI (flaw fix F1)
  const isEpisode = cartoon.season !== undefined && cartoon.episode !== undefined;

  // Close on pressing Escape key (the keyboard-nav hook skips keys while the
  // modal is open, so this is the single Escape owner — flaw fix F6)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Controls auto-hide on mouse movement
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Persist player preferences whenever they change (flaw fix F24)
  useEffect(() => {
    writePlayerPrefs({ volume, isMuted });
  }, [volume, isMuted]);

  // Sync Volume & Mute state dynamically between elements
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    if (cartoon.audioUrl && audio) {
      // Dual-element mode: Video is always muted, Audio plays sound
      video.muted = true;
      video.volume = 0;
      audio.muted = isMuted;
      audio.volume = volume;
    } else {
      // Single-element mode: Video plays sound
      video.muted = isMuted;
      video.volume = volume;
    }
  }, [volume, isMuted, cartoon.audioUrl, retryKey]);

  // Resume from last watched position + save progress while watching (P2-2)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saveProgress = (seconds) => {
      if (!onProgressSave) return;
      onProgressSave(seconds);
    };

    let resumed = false;
    const onLoadedMetadata = () => {
      // Seek to the saved position unless the episode was watched to the end
      if (!resumed && resumeAt > 5 && isFinite(video.duration) && resumeAt < video.duration - RESUME_THRESHOLD) {
        video.currentTime = resumeAt;
      }
      resumed = true;
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    // Throttled progress writes while playing
    const intervalId = setInterval(() => {
      const v = videoRef.current;
      if (v && v.currentTime > 5 && isFinite(v.duration)) {
        // Watched to (almost) the end → reset progress so it replays from the start
        if (v.duration - v.currentTime < RESUME_THRESHOLD) {
          writeProgress(cartoon.id, 0);
        } else {
          saveProgress(v.currentTime);
        }
      }
    }, PROGRESS_SAVE_INTERVAL);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      clearInterval(intervalId);
      // Final save on unmount/close — `video` is the stable DOM node mounted
      // with this modal instance, so capturing it here is safe
      if (video.currentTime > 5 && isFinite(video.duration)) {
        const seconds = video.duration - video.currentTime < RESUME_THRESHOLD ? 0 : video.currentTime;
        saveProgress(seconds);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartoon.id, retryKey]);

  // Sync Video and Audio Events (Play/Pause, Buffer, seeking, drift correction)
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      if (cartoon.audioUrl && audio) {
        audio.play().catch((e) => console.warn('Audio autoplay prevented:', e));
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      if (cartoon.audioUrl && audio) {
        audio.pause();
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Drift correction: if drift between video and audio is more than 0.15s, align them
      if (cartoon.audioUrl && audio) {
        const drift = Math.abs(video.currentTime - audio.currentTime);
        if (drift > 0.15) {
          audio.currentTime = video.currentTime;
        }
      }
    };

    const onDurationChange = () => {
      setDuration(video.duration);
    };

    const onSeeking = () => {
      if (cartoon.audioUrl && audio) {
        audio.currentTime = video.currentTime;
      }
    };

    const onWaiting = () => {
      setIsBuffering(true);
      if (cartoon.audioUrl && audio) {
        audio.pause();
      }
    };

    const onPlaying = () => {
      setIsBuffering(false);
      if (cartoon.audioUrl && audio && !video.paused) {
        audio.play().catch(() => {});
      }
    };

    // Flaw fix F12: media load failures now surface as a retry card
    const onError = () => {
      setIsBuffering(false);
      setMediaError('Could not reach the Internet Archive. The stream may be offline — please retry.');
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeking);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeking);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
    };
  }, [cartoon.audioUrl, retryKey]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
      );
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('msfullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('msfullscreenchange', handleFsChange);
    };
  }, []);

  if (!cartoon) return null;

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  // Flaw fix F12: play/pause follows the media element's actual state (source of truth)
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    const audio = audioRef.current;

    if (video.paused) {
      video.play().catch(() => {
        setMediaError('Playback could not start. Please try again.');
      });
      if (cartoon.audioUrl && audio) {
        audio.play().catch(() => {});
      }
    } else {
      video.pause();
      if (cartoon.audioUrl && audio) {
        audio.pause();
      }
    }
  };

  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (cartoon.audioUrl && audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleSkip = (seconds) => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    let newTime = video.currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > duration) newTime = duration;

    setCurrentTime(newTime);
    video.currentTime = newTime;
    if (cartoon.audioUrl && audio) {
      audio.currentTime = newTime;
    }
  };

  const handleFullscreenToggle = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const p = wrapper.requestFullscreen
        ? wrapper.requestFullscreen()
        : (wrapper.webkitRequestFullscreen ? wrapper.webkitRequestFullscreen() : Promise.resolve());

      Promise.resolve(p).then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    } else {
      const p = document.exitFullscreen
        ? document.exitFullscreen()
        : (document.webkitExitFullscreen ? document.webkitExitFullscreen() : Promise.resolve());

      Promise.resolve(p).then(() => {
        if (screen.orientation && screen.orientation.unlock) {
          try {
            screen.orientation.unlock();
          } catch {
            /* not locked */
          }
        }
      }).catch(() => {});
    }
  };

  // Flaw fix F12: retry a failed stream by remounting the media sources
  const handleRetry = () => {
    setMediaError(null);
    setIsBuffering(true);
    setRetryKey((k) => k + 1);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container-glow" ref={modalRef}>

        {/* Standard Modal Close Button (hidden in fullscreen mode) */}
        {!isFullscreen && (
          <button className="modal-close-btn" onClick={onClose} aria-label="Close player">
            <X size={24} />
          </button>
        )}

        {/* Custom Video Player Wrapper */}
        <div
          ref={wrapperRef}
          className={`modal-video-wrapper ${showControls ? 'controls-visible' : ''}`}
          onMouseMove={handleMouseMove}
        >
          {/* Hidden Tamil Audio Element — loads lazily (flaw fix F17) */}
          {cartoon.audioUrl && (
            <audio
              ref={audioRef}
              src={cartoon.audioUrl}
              preload="metadata"
            />
          )}

          {/* Video Element */}
          <video
            key={retryKey}
            ref={videoRef}
            className="modal-video-element"
            autoPlay
            playsInline
            src={cartoon.videoUrl || undefined}
            poster={cartoon.thumbnail}
            muted={!!cartoon.audioUrl || isMuted}
          >
            {/* Flaw fix F16: optional caption track (data field: captionsUrl) */}
            {cartoon.captionsUrl && (
              <track kind="captions" src={cartoon.captionsUrl} srcLang="ta" label="Tamil" default />
            )}
            Your browser does not support the video tag.
          </video>

          {/* Buffering Indicator */}
          {isBuffering && !mediaError && (
            <div className="player-center-overlay">
              <div className="spinner-loader"></div>
            </div>
          )}

          {/* Flaw fix F12: friendly retry card when the archive is unreachable */}
          {mediaError && (
            <div className="player-center-overlay player-error-overlay" role="alert">
              <p className="player-error-text">{mediaError}</p>
              <button className="player-retry-btn" onClick={handleRetry}>
                <RotateCw size={16} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Top HUD Overlay (Close/Back & Title) */}
          {showControls && (
            <div className="player-top-bar">
              <button
                className="player-back-btn"
                onClick={isFullscreen ? handleFullscreenToggle : onClose}
              >
                <X size={20} />
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Back'}</span>
              </button>
              <div className="player-top-title">
                {cartoon.title}
                {isEpisode ? ` - Season ${cartoon.season} Episode ${cartoon.episode}` : ''}
              </div>
            </div>
          )}

          {/* Bottom HUD Controls Overlay */}
          <div className="player-controls-overlay">
            {/* Timeline Progress Slider (disabled until duration is known — flaw fix F18) */}
            <div className="player-progress-container">
              <span className="player-time-display">{formatTime(currentTime)}</span>
              <input
                type="range"
                className="player-progress-bar"
                min={0}
                max={duration > 0 ? duration : 100}
                value={currentTime}
                onChange={handleSeekChange}
                disabled={!(duration > 0)}
                aria-label="Seek position"
              />
              <span className="player-time-display">{formatTime(duration)}</span>
            </div>

            {/* Controls Button Row */}
            <div className="player-controls-row">
              <div className="player-controls-group">
                <button className="player-btn" onClick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                </button>

                <button className="player-btn" onClick={() => handleSkip(-10)} aria-label="Rewind 10s">
                  <RotateCcw size={20} />
                </button>

                <button className="player-btn" onClick={() => handleSkip(10)} aria-label="Forward 10s">
                  <RotateCw size={20} />
                </button>

                <div className="player-volume-container">
                  <button className="player-btn" onClick={handleMuteToggle} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    className="player-volume-slider"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                  />
                </div>
              </div>

              <div className="player-controls-group">
                <button className="player-btn" onClick={handleFullscreenToggle} aria-label="Toggle Fullscreen">
                  {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Information Metadata Area — context-aware (flaw fix F1) */}
        <div className="modal-info-content">
          <div className="modal-info-header">
            <div>
              <div className="modal-channel-badge-container">
                {isEpisode ? (
                  <>
                    <span className="modal-channel-badge">
                      Season {cartoon.season}
                    </span>
                    <span className="modal-era-badge">
                      Episode {cartoon.episode}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="modal-channel-badge">
                      <Tv size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                      {cartoon.channel}
                    </span>
                    <span className="modal-era-badge">
                      <Calendar size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                      {cartoon.year}
                    </span>
                  </>
                )}
              </div>
              <h2 className="modal-title">{cartoon.title}</h2>
              <h3 className="modal-subtitle">{cartoon.tamilTitle}</h3>
            </div>

            <button
              className={`modal-fav-btn ${isFav ? 'active' : ''}`}
              onClick={() => onToggleFav(cartoon)}
            >
              <Heart className={`heart-icon ${isFav ? 'heart-filled' : ''}`} size={20} />
              <span>{isFav ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>
          </div>

          <div className="modal-meta-row">
            <div className="modal-meta-item text-yellow-glow">
              <Star size={16} className="star-icon" />
              <span>{cartoon.rating} Rating</span>
            </div>
            <span className="modal-meta-divider">|</span>
            <div className="modal-meta-item">
              <Shield size={16} />
              <span>{isEpisode ? `Talisman: ${cartoon.talisman}` : `Broadcaster: ${cartoon.channel}`}</span>
            </div>
            <span className="modal-meta-divider">|</span>
            <div className="modal-meta-item">
              <Clock size={16} />
              <span>{cartoon.duration}</span>
            </div>
          </div>

          <div className="modal-description-section">
            <h4 className="section-title">
              <Info size={16} className="title-icon" />
              {isEpisode ? 'Episode Synopsis & Talisman Hunt' : 'Synopsis'}
            </h4>
            <p className="modal-description">{cartoon.description}</p>
          </div>

          <div className="modal-tags-container">
            {cartoon.tags.map((tag, idx) => (
              <span key={idx} className="modal-tag-pill">
                #{tag}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
