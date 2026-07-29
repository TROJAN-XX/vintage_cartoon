import React, { useEffect, useRef } from 'react';
import { X, Star, Calendar, Clock, Shield, Heart, Info } from 'lucide-react';

export default function VideoModal({ cartoon, onClose, isFav, onToggleFav }) {
  const modalRef = useRef(null);
  const videoRef = useRef(null);

  // Close on pressing Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
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

  if (!cartoon) return null;

  // Handle clicking outside the main modal card to close
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  // Build the native video URL with optional start timestamp (#t=seconds)
  const videoSrc = cartoon.startAt 
    ? `${cartoon.videoUrl}#t=${cartoon.startAt}`
    : cartoon.videoUrl;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container-glow" ref={modalRef}>
        
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close player">
          <X size={24} />
        </button>

        {/* Video Player Area */}
        <div className="modal-video-wrapper">
          <video
            ref={videoRef}
            className="modal-video-element"
            controls
            autoPlay
            playsInline
            src={videoSrc}
            poster={cartoon.thumbnail}
          >
            Your browser does not support the video tag.
          </video>
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
