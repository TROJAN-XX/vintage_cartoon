import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Star, Shield, Clock, Info, Heart, 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, RotateCw 
} from 'lucide-react';

export default function VideoModal({ cartoon, onClose, isFav, onToggleFav }) {
  const modalRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const wrapperRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Custom player states
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Close on pressing Escape key
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
      if (isPlaying) {
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
  }, [isPlaying]);

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
  }, [volume, isMuted, cartoon.audioUrl]);

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

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeking);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeking);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [cartoon.audioUrl]);

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

  // Keyboard control shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!cartoon) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'm':
          e.preventDefault();
          handleMuteToggle();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => Math.min(prev + 0.1, 1));
          setIsMuted(false);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => Math.max(prev - 0.1, 0));
          break;
        case 'f':
          e.preventDefault();
          handleFullscreenToggle();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, volume, isMuted, duration, cartoon]);

  if (!cartoon) return null;

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      if (cartoon.audioUrl && audio) {
        audio.pause();
      }
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      if (cartoon.audioUrl && audio) {
        audio.play().catch(() => {});
      }
      setIsPlaying(true);
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
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if (wrapper.webkitRequestFullscreen) {
        wrapper.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Build video source with start time
  const videoSrc = cartoon.startAt 
    ? `${cartoon.videoUrl}#t=${cartoon.startAt}`
    : cartoon.videoUrl;

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
          {/* Hidden Tamil Audio Element */}
          {cartoon.audioUrl && (
            <audio
              ref={audioRef}
              src={cartoon.audioUrl}
              preload="auto"
            />
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            className="modal-video-element"
            autoPlay
            playsInline
            src={videoSrc}
            poster={cartoon.thumbnail}
            muted={!!cartoon.audioUrl || isMuted}
          >
            Your browser does not support the video tag.
          </video>

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="player-center-overlay">
              <div className="spinner-loader"></div>
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
                {cartoon.title} - Season {cartoon.season} Episode {cartoon.episode}
              </div>
            </div>
          )}

          {/* Bottom HUD Controls Overlay */}
          <div className="player-controls-overlay">
            {/* Timeline Progress Slider */}
            <div className="player-progress-container">
              <span className="player-time-display">{formatTime(currentTime)}</span>
              <input
                type="range"
                className="player-progress-bar"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
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
                  />
                </div>
              </div>

              <div className="player-controls-group">
                {cartoon.audioUrl && (
                  <span className="audio-sync-badge">
                    Tamil Audio Synced
                  </span>
                )}
                <button className="player-btn" onClick={handleFullscreenToggle} aria-label="Toggle Fullscreen">
                  {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Information Metadata Area */}
        <div className="modal-info-content">
          <div className="modal-info-header">
            <div>
              <div className="modal-channel-badge-container">
                <span className="modal-channel-badge">
                  Season {cartoon.season}
                </span>
                <span className="modal-era-badge">
                  Episode {cartoon.episode}
                </span>
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
              <span>Talisman: {cartoon.talisman}</span>
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
              Episode Synopsis & Talisman Hunt
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
