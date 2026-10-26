import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Video, 
  BookOpen, 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  FileText, 
  User, 
  Sparkles, 
  CheckCircle, 
  X, 
  AlertCircle,
  GraduationCap,
  Download
} from 'lucide-react';
import { useMlm } from '../context/MlmContext';
import { downloadManualPdf } from '../utils/downloadHelpers';

export default function AdminLearningManager() {
  const { 
    learningResources = [], 
    addLearningResource, 
    updateLearningResource, 
    deleteLearningResource,
    addToast 
  } = useMlm();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'video' | 'pdf'
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  // Form State
  const initialForm = {
    type: 'video',
    title: '',
    category: 'Threat Defense',
    author: 'CyberNetworking InfoSec Team',
    duration: '20 min',
    pageCount: 24,
    videoUrl: '',
    thumbnail: '',
    description: '',
    isFeatured: false,
    notes: ''
  };
  const [form, setForm] = useState(initialForm);

  const categories = useMemo(() => {
    const set = new Set([
      'Threat Defense',
      'Zero Trust & Cloud',
      'Malware Defense',
      'Regulatory Compliance',
      'Partner Handbook',
      'Technical Manual',
      'API & Web Security',
      'Quick Reference'
    ]);
    learningResources.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [learningResources]);

  const filteredResources = useMemo(() => {
    return learningResources.filter(res => {
      if (filterType !== 'all' && res.type !== filterType) return false;
      if (filterCategory !== 'all' && res.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = res.title?.toLowerCase().includes(q);
        const mAuthor = res.author?.toLowerCase().includes(q);
        const mCat = res.category?.toLowerCase().includes(q);
        if (!mTitle && !mAuthor && !mCat) return false;
      }
      return true;
    });
  }, [learningResources, filterType, filterCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingResource(null);
    setForm({
      ...initialForm,
      thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setEditingResource(res);
    setForm({
      type: res.type || 'video',
      title: res.title || '',
      category: res.category || 'Threat Defense',
      author: res.author || '',
      duration: res.duration || '20 min',
      pageCount: res.pageCount || 24,
      videoUrl: res.videoUrl || res.url || '',
      thumbnail: res.thumbnail || '',
      description: res.description || '',
      isFeatured: Boolean(res.isFeatured),
      notes: res.notes || ''
    });
    setModalOpen(true);
  };

  const handleDelete = (res) => {
    if (window.confirm(`Are you sure you want to delete the resource "${res.title}"? This action cannot be undone.`)) {
      deleteLearningResource(res.id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      addToast('Please enter a valid title.', 'error');
      return;
    }

    const payload = {
      type: form.type,
      title: form.title.trim(),
      category: form.category,
      author: form.author.trim() || 'CyberNetworking Desk',
      description: form.description.trim(),
      duration: form.type === 'video' ? form.duration : undefined,
      pageCount: form.type === 'pdf' ? Number(form.pageCount) : undefined,
      videoUrl: form.videoUrl.trim(),
      url: form.videoUrl.trim(),
      thumbnail: form.thumbnail.trim() || (form.type === 'video' ? 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80'),
      isFeatured: form.isFeatured,
      notes: form.notes
    };

    if (editingResource) {
      await updateLearningResource(editingResource.id, payload);
    } else {
      await addLearningResource(payload);
    }

    setModalOpen(false);
  };

  const videoCount = learningResources.filter(r => r.type === 'video').length;
  const pdfCount = learningResources.filter(r => r.type === 'pdf').length;
  const featuredCount = learningResources.filter(r => r.isFeatured).length;

  return (
    <div className="admin-learning-manager">
      {/* 1. Header Bar */}
      <div className="admin-learning-header card-white">
        <div className="admin-learning-header-left">
          <div className="admin-header-icon-box bg-blue-dim text-primary-blue">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className="admin-table-section-title">Academy & Learning Resources Desk</h2>
            <p className="admin-table-section-sub">
              Manage cybersecurity training videos, curricula, partner manuals, and statutory PDF books.
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenAdd}
          className="btn btn-primary btn-sm flex-center gap-1.5 shrink-0"
        >
          <Plus size={16} />
          <span>Add New Resource</span>
        </button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="admin-metrics-row mt-4">
        <div className="admin-stat-card card-white">
          <span className="stat-label-muted">Total Academy Content</span>
          <div className="stat-number-bold">{learningResources.length}</div>
          <span className="stat-badge-tag text-primary-blue">Curated Curriculum</span>
        </div>

        <div className="admin-stat-card card-white">
          <span className="stat-label-muted">Training Videos</span>
          <div className="stat-number-bold text-primary-blue">{videoCount}</div>
          <span className="stat-badge-tag text-success">Interactive Lessons</span>
        </div>

        <div className="admin-stat-card card-white">
          <span className="stat-label-muted">Books & Manuals</span>
          <div className="stat-number-bold text-purple">{pdfCount}</div>
          <span className="stat-badge-tag text-purple">Statutory PDFs</span>
        </div>

        <div className="admin-stat-card card-white">
          <span className="stat-label-muted">Featured Materials</span>
          <div className="stat-number-bold text-amber">{featuredCount}</div>
          <span className="stat-badge-tag text-amber">Promoted on Top</span>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="admin-filter-bar card-white mt-4">
        <div className="flex-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Types ({learningResources.length})
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`btn btn-sm ${filterType === 'video' ? 'btn-primary' : 'btn-secondary'} flex-center gap-1`}
          >
            <Video size={14} />
            <span>Videos ({videoCount})</span>
          </button>
          <button
            onClick={() => setFilterType('pdf')}
            className={`btn btn-sm ${filterType === 'pdf' ? 'btn-primary' : 'btn-secondary'} flex-center gap-1`}
          >
            <BookOpen size={14} />
            <span>PDFs ({pdfCount})</span>
          </button>
        </div>

        <div className="flex-center gap-3">
          <div className="admin-search-wrapper">
            <Search size={15} className="text-muted" />
            <input
              type="text"
              placeholder="Search by title, author, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-field"
            />
          </div>

          <div className="admin-select-wrapper">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="admin-select-field"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Resources Table */}
      <div className="admin-table-container card-white mt-4">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Resource & Title</th>
              <th>Type</th>
              <th>Category</th>
              <th>Author / Instructor</th>
              <th>Length</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-muted">
                  No learning resources match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredResources.map(res => {
                const isVideo = res.type === 'video';

                return (
                  <tr key={res.id}>
                    <td>
                      <div className="flex-center gap-3" style={{ justifyContent: 'flex-start' }}>
                        <img 
                          src={res.thumbnail || (isVideo ? 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80')} 
                          alt={res.title}
                          className="admin-thumb-tiny"
                        />
                        <div>
                          <div className="flex-center gap-1.5" style={{ justifyContent: 'flex-start' }}>
                            <span className="font-bold text-primary">{res.title}</span>
                            {res.isFeatured && (
                              <span className="badge badge-green font-xs">Featured</span>
                            )}
                          </div>
                          <div className="font-xs text-muted line-clamp-1 mt-0.5">
                            {res.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${isVideo ? 'badge-blue' : 'badge-purple'} font-xs flex-center gap-1`}>
                        {isVideo ? <Video size={12} /> : <BookOpen size={12} />}
                        <span>{isVideo ? 'Video' : 'PDF Manual'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-amber font-xs font-semibold">
                        {res.category}
                      </span>
                    </td>
                    <td>
                      <span className="font-sm text-secondary font-medium">
                        {res.author || 'CyberNetworking Desk'}
                      </span>
                    </td>
                    <td>
                      <span className="font-sm code-font text-muted">
                        {isVideo ? res.duration || '20 min' : `${res.pageCount || res.pages?.length || 24} Pages`}
                      </span>
                    </td>
                    <td>
                      <div className="flex-center gap-1.5" style={{ justifyContent: 'flex-end' }}>
                        {!isVideo && (
                          <button
                            onClick={() => downloadManualPdf(res)}
                            className="btn-icon-subtle"
                            title="Test Download PDF"
                          >
                            <Download size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(res)}
                          className="btn-icon-subtle text-primary-blue"
                          title="Edit Resource"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(res)}
                          className="btn-icon-subtle text-rose"
                          title="Delete Resource"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT RESOURCE MODAL                                              */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="learning-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="admin-resource-modal-card card-white" onClick={e => e.stopPropagation()}>
            <div className="learning-modal-header">
              <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                <div className="learning-modal-icon-badge bg-blue-dim text-primary-blue">
                  {editingResource ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 className="learning-modal-title">
                    {editingResource ? 'Edit Learning Resource' : 'Add New Learning Resource'}
                  </h3>
                  <p className="font-xs text-muted">
                    {editingResource ? `Modifying resource: ${editingResource.id}` : 'Create a new cybersecurity training video or PDF manual'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setModalOpen(false)}
                className="learning-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-resource-form">
              {/* Type Switcher */}
              <div className="admin-form-group">
                <label className="admin-form-label">Resource Type</label>
                <div className="admin-type-switcher">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'video' })}
                    className={`admin-type-option ${form.type === 'video' ? 'active' : ''}`}
                  >
                    <Video size={16} />
                    <span>Cyber Video Training</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'pdf' })}
                    className={`admin-type-option ${form.type === 'pdf' ? 'active' : ''}`}
                  >
                    <BookOpen size={16} />
                    <span>PDF Book / Manual</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="admin-form-group">
                <label className="admin-form-label">Resource Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zero Trust Architecture & Endpoint Hardening"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="admin-form-input"
                />
              </div>

              {/* 2-Column Grid: Category & Author */}
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Category / Domain</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    placeholder="e.g. Threat Defense"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="admin-form-input"
                  />
                  <datalist id="category-suggestions">
                    {categories.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Instructor / Author</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Matru Prasad Mohanty"
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
              </div>

              {/* 2-Column Grid: Duration / Pages & URL */}
              <div className="admin-form-row">
                {form.type === 'video' ? (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Video Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 24 min"
                      value={form.duration}
                      onChange={e => setForm({ ...form, duration: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>
                ) : (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Page Count</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 48"
                      value={form.pageCount}
                      onChange={e => setForm({ ...form, pageCount: e.target.value })}
                      className="admin-form-input"
                    />
                  </div>
                )}

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    {form.type === 'video' ? 'Video Stream URL (YouTube or MP4)' : 'PDF Document Link / Storage URI'}
                  </label>
                  <input
                    type="text"
                    placeholder={form.type === 'video' ? 'https://www.youtube.com/embed/yrr_W7j9r4E' : 'https://cybernetworking.vercel.app/docs/manual.pdf'}
                    value={form.videoUrl}
                    onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
              </div>

              {/* Thumbnail URL */}
              <div className="admin-form-group">
                <label className="admin-form-label">Thumbnail / Cover Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={form.thumbnail}
                  onChange={e => setForm({ ...form, thumbnail: e.target.value })}
                  className="admin-form-input"
                />
              </div>

              {/* Description */}
              <div className="admin-form-group">
                <label className="admin-form-label">Description & Summary</label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive description of the curriculum or manual contents..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="admin-form-textarea"
                />
              </div>

              {/* Key Notes / Takeaways */}
              <div className="admin-form-group">
                <label className="admin-form-label">Key Strategic Takeaway / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Over 82% of corporate breaches start with human error..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="admin-form-input"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="admin-form-checkbox-row">
                <label className="flex-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={e => setForm({ ...form, isFeatured: e.target.checked })}
                    className="admin-checkbox"
                  />
                  <span className="font-sm font-semibold text-primary">Mark as Featured (Promote on Top)</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="admin-form-actions mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>{editingResource ? 'Save Changes' : 'Publish Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
