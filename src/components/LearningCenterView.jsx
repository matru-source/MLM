import React, { useState, useMemo, useEffect } from 'react';
import { 
  Play, 
  Video, 
  BookOpen, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  User, 
  Tag, 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useMlm } from '../context/MlmContext';
import { downloadManualPdf } from '../utils/downloadHelpers';

export default function LearningCenterView() {
  const { 
    learningResources = [], 
    completedResources = {}, 
    toggleResourceCompleted, 
    currentMember,
    addToast 
  } = useMlm();

  const [activeTypeFilter, setActiveTypeFilter] = useState('all'); // 'all' | 'video' | 'pdf'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Viewer Modals State
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [activePdfModal, setActivePdfModal] = useState(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    learningResources.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [learningResources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return learningResources.filter(res => {
      // Type filter
      if (activeTypeFilter !== 'all' && res.type !== activeTypeFilter) return false;

      // Category filter
      if (selectedCategory !== 'all' && res.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = res.title?.toLowerCase().includes(query);
        const descMatch = res.description?.toLowerCase().includes(query);
        const authorMatch = res.author?.toLowerCase().includes(query);
        const catMatch = res.category?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !authorMatch && !catMatch) return false;
      }

      return true;
    });
  }, [learningResources, activeTypeFilter, selectedCategory, searchQuery]);

  const videoCount = learningResources.filter(r => r.type === 'video').length;
  const pdfCount = learningResources.filter(r => r.type === 'pdf').length;

  const currentMemberId = currentMember?.member_id || currentMember?.id || 'guest';
  const completedCount = learningResources.filter(r => completedResources[`${currentMemberId}_${r.id}`]).length;

  // Keyboard navigation for PDF modal
  useEffect(() => {
    if (!activePdfModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        const maxPages = activePdfModal.pages?.length || activePdfModal.pageCount || 1;
        setPdfCurrentPage(p => Math.min(p + 1, maxPages));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPdfCurrentPage(p => Math.max(p - 1, 1));
      } else if (e.key === 'Escape') {
        setActivePdfModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePdfModal]);

  const handleOpenPdf = (resource) => {
    setActivePdfModal(resource);
    setPdfCurrentPage(1);
    setPdfZoom(100);
  };

  const handleDownloadPdf = (resource, e) => {
    if (e) e.stopPropagation();
    try {
      downloadManualPdf(resource);
      addToast(`Downloaded "${resource.title}" PDF successfully!`, 'success');
    } catch (err) {
      addToast('Failed to generate PDF document.', 'error');
    }
  };

  const isCompleted = (resourceId) => {
    return Boolean(completedResources[`${currentMemberId}_${resourceId}`]);
  };

  return (
    <div className="learning-center-view">
      {/* 1. Header Banner */}
      <div className="learning-header-banner card-white">
        <div className="learning-header-left">
          <div className="learning-header-icon-box">
            <GraduationCap size={28} className="text-primary-blue" />
          </div>
          <div>
            <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
              <h2 className="learning-header-title">Cyber Academy & Learning Hub</h2>
              <span className="badge badge-blue font-xs flex-center gap-1">
                <Sparkles size={12} />
                Partner Training 2026
              </span>
            </div>
            <p className="learning-header-sub">
              Authorized cybersecurity training videos, threat defense modules, and official direct selling statutory manuals.
            </p>
          </div>
        </div>

        {/* Learning Stats Cards */}
        <div className="learning-stats-row">
          <div className="learning-stat-chip">
            <div className="learning-stat-num text-primary-blue">{videoCount}</div>
            <div className="learning-stat-lbl">Video Courses</div>
          </div>
          <div className="learning-stat-chip">
            <div className="learning-stat-num text-purple">{pdfCount}</div>
            <div className="learning-stat-lbl">Books & Manuals</div>
          </div>
          <div className="learning-stat-chip">
            <div className="learning-stat-num text-success">{completedCount}</div>
            <div className="learning-stat-lbl">Completed</div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Tabs Toolbar */}
      <div className="learning-controls-bar card-white mt-4">
        {/* Navigation Tabs */}
        <div className="learning-tabs-group">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={`learning-tab-btn ${activeTypeFilter === 'all' ? 'active' : ''}`}
          >
            <span>All Resources</span>
            <span className="learning-tab-count">{learningResources.length}</span>
          </button>

          <button
            onClick={() => setActiveTypeFilter('video')}
            className={`learning-tab-btn ${activeTypeFilter === 'video' ? 'active' : ''}`}
          >
            <Video size={16} />
            <span>Cyber Training Videos</span>
            <span className="learning-tab-count">{videoCount}</span>
          </button>

          <button
            onClick={() => setActiveTypeFilter('pdf')}
            className={`learning-tab-btn ${activeTypeFilter === 'pdf' ? 'active' : ''}`}
          >
            <BookOpen size={16} />
            <span>Books & Manuals</span>
            <span className="learning-tab-count">{pdfCount}</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="learning-filters-group">
          <div className="learning-search-box">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Search training or manuals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="learning-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="learning-search-clear"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="learning-category-select-wrap">
            <Filter size={14} className="text-muted" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="learning-category-select"
            >
              <option value="all">All Topics & Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="learning-empty-state card-white mt-4">
          <GraduationCap size={48} className="text-muted mb-2" />
          <h4 className="text-primary font-bold">No Training Resources Found</h4>
          <p className="text-muted font-sm">
            Try adjusting your search query or selecting a different category filter.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setActiveTypeFilter('all'); }}
            className="btn btn-primary btn-sm mt-3"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="learning-resource-grid mt-4">
          {filteredResources.map(res => {
            const completed = isCompleted(res.id);
            const isVideo = res.type === 'video';

            return (
              <div 
                key={res.id} 
                className={`learning-resource-card card-white ${completed ? 'completed-card' : ''}`}
              >
                {/* Thumbnail Header with Badges */}
                <div 
                  className="resource-thumb-container"
                  onClick={() => isVideo ? setActiveVideoModal(res) : handleOpenPdf(res)}
                >
                  <img 
                    src={res.thumbnail || (isVideo ? 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80')} 
                    alt={res.title}
                    className="resource-thumb-img"
                  />

                  {/* Play / Open Hover Overlay */}
                  <div className="resource-thumb-overlay">
                    <div className="resource-play-circle">
                      {isVideo ? <Play size={22} fill="currentColor" /> : <BookOpen size={22} />}
                    </div>
                  </div>

                  {/* Duration or Page Badge */}
                  <div className="resource-duration-badge">
                    {isVideo ? (
                      <>
                        <Clock size={12} />
                        <span>{res.duration || '20 min'}</span>
                      </>
                    ) : (
                      <>
                        <FileText size={12} />
                        <span>{res.pageCount || res.pages?.length || 24} Pages</span>
                      </>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div className={`resource-type-pill ${isVideo ? 'type-video' : 'type-pdf'}`}>
                    {isVideo ? <Video size={11} /> : <BookOpen size={11} />}
                    <span>{isVideo ? 'Video Training' : 'PDF Book & Manual'}</span>
                  </div>

                  {/* Completed Badge */}
                  {completed && (
                    <div className="resource-completed-badge">
                      <CheckCircle size={13} />
                      <span>Completed</span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="resource-card-body">
                  <div className="resource-meta-row">
                    <span className="badge badge-purple font-xs font-semibold">
                      {res.category || 'Cyber Defense'}
                    </span>
                    {res.isFeatured && (
                      <span className="badge badge-green font-xs font-bold">
                        ★ Featured
                      </span>
                    )}
                  </div>

                  <h3 
                    className="resource-card-title"
                    onClick={() => isVideo ? setActiveVideoModal(res) : handleOpenPdf(res)}
                  >
                    {res.title}
                  </h3>

                  <p className="resource-card-desc">
                    {res.description}
                  </p>

                  <div className="resource-author-row">
                    <User size={13} className="text-muted" />
                    <span>{res.author || 'CyberNetworking Desk'}</span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="resource-card-footer">
                  {isVideo ? (
                    <button
                      onClick={() => setActiveVideoModal(res)}
                      className="btn btn-primary btn-sm w-full flex-center gap-1.5"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Watch Training Lesson</span>
                    </button>
                  ) : (
                    <div className="flex-center gap-2 w-full">
                      <button
                        onClick={() => handleOpenPdf(res)}
                        className="btn btn-primary btn-sm flex-1 flex-center gap-1.5"
                      >
                        <BookOpen size={14} />
                        <span>Read Manual</span>
                      </button>
                      <button
                        onClick={(e) => handleDownloadPdf(res, e)}
                        className="btn btn-secondary btn-sm flex-center gap-1 shrink-0"
                        title="Download PDF"
                      >
                        <Download size={14} />
                        <span>PDF</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => toggleResourceCompleted(currentMemberId, res.id)}
                    className={`resource-toggle-complete-btn mt-2 ${completed ? 'is-completed' : ''}`}
                    title={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                  >
                    <CheckCircle size={14} />
                    <span>{completed ? 'Mark as Incomplete' : 'Mark as Done'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIDEO VIEWER MODAL                                                     */}
      {/* ========================================================================= */}
      {activeVideoModal && (
        <div className="learning-modal-backdrop" onClick={() => setActiveVideoModal(null)}>
          <div className="learning-video-modal-card" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="learning-modal-header">
              <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                <div className="learning-modal-icon-badge bg-blue-dim text-primary-blue">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="learning-modal-title">{activeVideoModal.title}</h3>
                  <div className="learning-modal-meta">
                    <span className="badge badge-purple font-xs">{activeVideoModal.category}</span>
                    <span>•</span>
                    <span className="flex-center gap-1">
                      <Clock size={12} />
                      {activeVideoModal.duration}
                    </span>
                    <span>•</span>
                    <span>Instructor: {activeVideoModal.author}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveVideoModal(null)}
                className="learning-modal-close-btn"
                title="Close Viewer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Player Area */}
            <div className="learning-video-player-container">
              {activeVideoModal.videoUrl && activeVideoModal.videoUrl.includes('youtube') ? (
                <iframe
                  src={`${activeVideoModal.videoUrl}?autoplay=1&rel=0`}
                  title={activeVideoModal.title}
                  className="learning-video-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="learning-video-fallback-player">
                  <img 
                    src={activeVideoModal.thumbnail} 
                    alt={activeVideoModal.title}
                    className="learning-fallback-bg" 
                  />
                  <div className="learning-fallback-overlay">
                    <div className="learning-fallback-badge">
                      <ShieldCheck size={20} />
                      <span>Interactive Cyber Video Stream</span>
                    </div>
                    <div className="learning-mock-controls">
                      <Play size={32} fill="#ffffff" />
                    </div>
                    <p className="learning-fallback-text">
                      Streaming Secure Lesson Telemetry • CyberNetworking InfoSec Broadcast
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chapters & Notes Section */}
            <div className="learning-video-details-grid">
              <div className="learning-video-left-pane">
                <h4 className="learning-section-subhead">Lesson Description & Brief</h4>
                <p className="learning-video-desc-full">{activeVideoModal.description}</p>

                {activeVideoModal.notes && (
                  <div className="learning-notes-callout">
                    <div className="flex-center gap-1.5 text-primary-blue font-bold mb-1" style={{ justifyContent: 'flex-start' }}>
                      <Award size={16} />
                      <span>Key Strategic Takeaway</span>
                    </div>
                    <p className="font-sm text-secondary">{activeVideoModal.notes}</p>
                  </div>
                )}
              </div>

              {activeVideoModal.chapters && activeVideoModal.chapters.length > 0 && (
                <div className="learning-video-chapters-pane">
                  <h4 className="learning-section-subhead">Curriculum Timestamps</h4>
                  <div className="learning-chapters-list">
                    {activeVideoModal.chapters.map((ch, idx) => (
                      <div key={idx} className="learning-chapter-item">
                        <span className="learning-chapter-time">{ch.time}</span>
                        <span className="learning-chapter-title">{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="learning-modal-footer">
              <div className="flex-center gap-2">
                <button
                  onClick={() => toggleResourceCompleted(currentMemberId, activeVideoModal.id)}
                  className={`btn ${isCompleted(activeVideoModal.id) ? 'btn-success' : 'btn-primary'} btn-sm flex-center gap-1.5`}
                >
                  <CheckCircle size={15} />
                  <span>{isCompleted(activeVideoModal.id) ? 'Completed ✓' : 'Mark as Complete'}</span>
                </button>
              </div>

              <button
                onClick={() => setActiveVideoModal(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PDF VIEWER & READER MODAL                                              */}
      {/* ========================================================================= */}
      {activePdfModal && (
        <div className={`learning-modal-backdrop ${isPdfFullscreen ? 'is-fullscreen' : ''}`} onClick={() => setActivePdfModal(null)}>
          <div 
            className={`learning-pdf-modal-card ${isPdfFullscreen ? 'card-fullscreen' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* PDF Toolbar */}
            <div className="learning-pdf-toolbar">
              <div className="pdf-toolbar-left">
                <div className="learning-modal-icon-badge bg-purple-dim text-purple">
                  <BookOpen size={18} />
                </div>
                <div className="pdf-doc-meta">
                  <h3 className="pdf-toolbar-title">{activePdfModal.title}</h3>
                  <div className="pdf-toolbar-sub">
                    <span className="badge badge-purple font-xs">{activePdfModal.category}</span>
                    <span>•</span>
                    <span>Author: {activePdfModal.author}</span>
                  </div>
                </div>
              </div>

              {/* Reader Controls */}
              <div className="pdf-toolbar-center">
                <button
                  onClick={() => setPdfCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={pdfCurrentPage <= 1}
                  className="pdf-page-btn"
                  title="Previous Page (Left Arrow)"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="pdf-page-indicator">
                  <span>Page</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={activePdfModal.pages?.length || activePdfModal.pageCount || 1}
                    value={pdfCurrentPage}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const max = activePdfModal.pages?.length || activePdfModal.pageCount || 1;
                      if (v >= 1 && v <= max) setPdfCurrentPage(v);
                    }}
                    className="pdf-page-input"
                  />
                  <span>of {activePdfModal.pages?.length || activePdfModal.pageCount || 1}</span>
                </div>

                <button
                  onClick={() => {
                    const max = activePdfModal.pages?.length || activePdfModal.pageCount || 1;
                    setPdfCurrentPage(p => Math.min(p + 1, max));
                  }}
                  disabled={pdfCurrentPage >= (activePdfModal.pages?.length || activePdfModal.pageCount || 1)}
                  className="pdf-page-btn"
                  title="Next Page (Right Arrow)"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="pdf-toolbar-right">
                {/* Zoom Controls */}
                <div className="pdf-zoom-group">
                  <button 
                    onClick={() => setPdfZoom(z => Math.max(z - 15, 70))}
                    className="pdf-tool-btn"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="pdf-zoom-label">{pdfZoom}%</span>
                  <button 
                    onClick={() => setPdfZoom(z => Math.min(z + 15, 160))}
                    className="pdf-tool-btn"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={() => setPdfZoom(100)}
                    className="pdf-tool-btn"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                {/* Download PDF button */}
                <button
                  onClick={(e) => handleDownloadPdf(activePdfModal, e)}
                  className="btn btn-secondary btn-sm flex-center gap-1"
                  title="Generate & Download Full PDF"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="pdf-tool-btn"
                  title={isPdfFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reading Mode'}
                >
                  {isPdfFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  onClick={() => setActivePdfModal(null)}
                  className="learning-modal-close-btn"
                  title="Close Manual"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PDF Document Canvas / Page Viewer */}
            <div className="learning-pdf-canvas-container">
              <div 
                className="pdf-paper-sheet"
                style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
              >
                {/* Paper Header Stripe */}
                <div className="pdf-sheet-top-stripe">
                  <div className="flex-center gap-2">
                    <img src="/logo.png?v=2" alt="Logo" className="pdf-sheet-logo" />
                    <span className="pdf-sheet-brand">CyberNetworking</span>
                  </div>
                  <span className="pdf-sheet-doc-badge">
                    {activePdfModal.category?.toUpperCase()} • {activePdfModal.id}
                  </span>
                </div>

                {/* Page Content */}
                {(() => {
                  const pages = activePdfModal.pages || [];
                  const activePage = pages[pdfCurrentPage - 1];

                  if (!activePage) {
                    return (
                      <div className="pdf-fallback-content">
                        <h2 className="pdf-page-heading">{activePdfModal.title}</h2>
                        <div className="badge badge-purple mt-2 mb-4">{activePdfModal.category}</div>
                        <p className="pdf-page-paragraph">{activePdfModal.description}</p>
                        <div className="pdf-callout-box mt-4">
                          <h4 className="font-bold text-primary mb-1">Official Document Information</h4>
                          <p className="font-sm text-secondary">
                            This manual contains {activePdfModal.pageCount || 24} pages of technical operating procedures, statutory regulations, and incident response directives.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="pdf-rendered-page">
                      <div className="pdf-page-header-row">
                        <span className="pdf-page-num-tag">Chapter / Page {pdfCurrentPage}</span>
                        <h2 className="pdf-page-title">{activePage.title}</h2>
                      </div>

                      <div className="pdf-page-body-text">
                        {activePage.content.split('\n').map((paragraph, pIdx) => {
                          const trimmed = paragraph.trim();
                          if (!trimmed) return <div key={pIdx} className="pdf-spacer" />;

                          if (trimmed.startsWith('# ')) {
                            return <h1 key={pIdx} className="pdf-h1">{trimmed.replace('# ', '')}</h1>;
                          }
                          if (trimmed.startsWith('## ')) {
                            return <h2 key={pIdx} className="pdf-h2">{trimmed.replace('## ', '')}</h2>;
                          }
                          if (trimmed.startsWith('### ')) {
                            return <h3 key={pIdx} className="pdf-h3">{trimmed.replace('### ', '')}</h3>;
                          }
                          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                            return (
                              <li key={pIdx} className="pdf-li">
                                {trimmed.replace(/^[-*]\s+/, '')}
                              </li>
                            );
                          }
                          if (trimmed.startsWith('|')) {
                            return <div key={pIdx} className="pdf-table-row-text">{trimmed}</div>;
                          }

                          return (
                            <p key={pIdx} className="pdf-p">
                              {trimmed}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Paper Footer */}
                <div className="pdf-sheet-footer">
                  <span className="font-xs text-muted">
                    Confidential & Proprietary • CyberNetworking Direct Selling Partner Network
                  </span>
                  <span className="font-xs font-bold text-secondary">
                    Page {pdfCurrentPage} of {activePdfModal.pages?.length || activePdfModal.pageCount || 1}
                  </span>
                </div>
              </div>
            </div>

            {/* PDF Modal Footer */}
            <div className="learning-pdf-modal-footer">
              <div className="flex-center gap-2">
                <button
                  onClick={() => toggleResourceCompleted(currentMemberId, activePdfModal.id)}
                  className={`btn ${isCompleted(activePdfModal.id) ? 'btn-success' : 'btn-primary'} btn-sm flex-center gap-1.5`}
                >
                  <CheckCircle size={15} />
                  <span>{isCompleted(activePdfModal.id) ? 'Marked as Read ✓' : 'Mark as Read'}</span>
                </button>
                <button
                  onClick={(e) => handleDownloadPdf(activePdfModal, e)}
                  className="btn btn-secondary btn-sm flex-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Full PDF</span>
                </button>
              </div>

              <div className="flex-center gap-2">
                <button
                  onClick={() => setActivePdfModal(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
