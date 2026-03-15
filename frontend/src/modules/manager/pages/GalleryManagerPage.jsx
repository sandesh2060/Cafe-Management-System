// src/modules/manager/pages/GalleryManagerPage.jsx
// ═══════════════════════════════════════════════════════════════════════
//  KAUSĪ CHIYĀ  ·  Manager Gallery Page  (/manager/gallery)
//  ✦ Upload photos (drag & drop + file picker)
//  ✦ Masonry grid of uploaded photos
//  ✦ Edit caption/category/featured  ✦  Delete  ✦  Feature toggle
//  ✦ Full dark / light mode
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useDispatch, useSelector } from 'react-redux'
import gsap from 'gsap'
import {
  Camera, Upload, Trash2, Star, Eye, EyeOff,
  X, Check, Tag, ChevronDown, ImagePlus, AlertCircle,
} from 'lucide-react'
import { ThemeContext } from '@shared/context/ThemeContext'
import DashboardLayout from '@shared/components/layout/DashboardLayout'
import {
  fetchPhotos, fetchCategories, uploadPhoto, deletePhoto, updatePhoto,
  selectPhotos, selectCategories, selectGalleryLoading,
  selectGalleryHasMore, selectGalleryPagination,
  selectGalleryUploading, selectUploadError,
  setActiveCategory, selectActiveCategory, clearUploadError,
  optimisticLikePhoto,
} from '@store/slices/gallerySlice'

const T = {
  amber:  '#F59E0B',
  rose:   '#F43F5E',
  green:  '#10B981',
  blue:   '#6366F1',
  ink:    '#1C0A02',
}

const CATEGORIES = [
  { value: 'kitchen',  label: 'Kitchen',  emoji: '🍳' },
  { value: 'food',     label: 'Food',     emoji: '☕' },
  { value: 'ambience', label: 'Ambience', emoji: '🪔' },
  { value: 'event',    label: 'Events',   emoji: '🎉' },
  { value: 'team',     label: 'Team',     emoji: '👥' },
  { value: 'other',    label: 'Other',    emoji: '📷' },
]

// ── Upload Panel ──────────────────────────────────────────────────────────────
function UploadPanel({ isDark, onUploaded }) {
  const dispatch  = useDispatch()
  const uploading = useSelector(selectGalleryUploading)
  const error     = useSelector(selectUploadError)

  const [files,      setFiles]      = useState([])
  const [caption,    setCaption]    = useState('')
  const [category,   setCategory]   = useState('other')
  const [tags,       setTags]       = useState('')
  const [featured,   setFeatured]   = useState(false)
  const [previews,   setPreviews]   = useState([])
  const [dragging,   setDragging]   = useState(false)
  const fileRef = useRef()

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...arr])
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = (e) => setPreviews(prev => [...prev, { name: f.name, src: e.target.result }])
      reader.readAsDataURL(f)
    })
  }

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!files.length) return
    dispatch(clearUploadError())
    for (const image of files) {
      await dispatch(uploadPhoto({ image, caption, category, tags, isFeatured: featured }))
    }
    setFiles([]); setPreviews([])
    setCaption(''); setTags(''); setFeatured(false)
    onUploaded?.()
  }

  const cardBg   = isDark ? '#1A1209' : '#FFFCF5'
  const border   = isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.18)'

  return (
    <div style={{
      borderRadius: 20, padding: '20px 22px',
      background: cardBg,
      border: `1px solid ${border}`,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Upload size={15} color={T.amber} />
        </div>
        <h2 style={{
          fontSize: 15, fontWeight: 800, margin: 0,
          fontFamily: "'DM Sans', sans-serif",
          color: isDark ? '#FDE68A' : T.ink,
        }}>Upload Photos</h2>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          borderRadius: 14, padding: '28px 20px',
          border: `2px dashed ${dragging ? T.amber : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
          background: dragging
            ? isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)'
            : 'transparent',
          cursor: 'pointer', textAlign: 'center',
          transition: 'all 0.2s',
          marginBottom: previews.length ? 14 : 0,
        }}
      >
        <ImagePlus size={22} color={isDark ? '#4B3728' : '#D1D5DB'} style={{ marginBottom: 8 }} />
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: isDark ? '#7A6550' : '#9CA3AF',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Drag & drop photos here, or click to browse
        </div>
        <div style={{
          fontSize: 11, marginTop: 4,
          color: isDark ? '#4B3728' : '#D1D5DB',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          JPG, PNG, WebP · Max 10MB each
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*"
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Preview thumbs */}
      {previews.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
        }}>
          {previews.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={p.src} style={{
                width: 70, height: 70, objectFit: 'cover',
                borderRadius: 10,
                border: `2px solid ${isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.25)'}`,
              }} />
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={e => { e.stopPropagation(); removeFile(i) }}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  background: T.rose, border: 'none', borderRadius: '50%',
                  width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}>
                <X size={11} />
              </motion.button>
            </div>
          ))}
        </div>
      )}

      {/* Fields */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Caption */}
          <input
            value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            style={{
              borderRadius: 10, padding: '10px 13px',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
              color: isDark ? '#F5F0E8' : T.ink,
              fontSize: 13, outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Category */}
            <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%', borderRadius: 10, padding: '10px 13px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
                  color: isDark ? '#F5F0E8' : T.ink,
                  fontSize: 13, outline: 'none', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  appearance: 'none',
                }}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
              <ChevronDown size={13} color={isDark ? '#7A6550' : '#9CA3AF'}
                style={{ position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Tags */}
            <input
              value={tags} onChange={e => setTags(e.target.value)}
              placeholder="Tags: chai, vibe, morning"
              style={{
                flex: 1, minWidth: 160, borderRadius: 10, padding: '10px 13px',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
                color: isDark ? '#F5F0E8' : T.ink,
                fontSize: 13, outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Featured toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 9,
            cursor: 'pointer', userSelect: 'none',
          }}>
            <div
              onClick={() => setFeatured(f => !f)}
              style={{
                width: 36, height: 20, borderRadius: 99,
                background: featured
                  ? 'linear-gradient(90deg, #F59E0B, #F97316)'
                  : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', position: 'absolute',
                top: 2, left: featured ? 18 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }} />
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: isDark ? '#C9B99A' : '#3D2C1A',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <Star size={12} fill={featured ? T.amber : 'none'}
                stroke={featured ? T.amber : isDark ? '#4B3728' : '#D1D5DB'}
                style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Mark as Featured
            </span>
          </label>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 12px', borderRadius: 9,
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.15)',
            }}>
              <AlertCircle size={13} color={T.rose} />
              <span style={{ fontSize: 12, color: T.rose,
                fontFamily: "'DM Sans', sans-serif" }}>{error}</span>
            </div>
          )}

          {/* Upload button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleUpload}
            disabled={uploading}
            style={{
              borderRadius: 12, padding: '12px',
              background: uploading
                ? isDark ? '#2A1A08' : '#F3F4F6'
                : 'linear-gradient(135deg, #F59E0B, #F97316)',
              border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
              color: uploading ? (isDark ? '#4B3728' : '#9CA3AF') : '#fff',
              fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: uploading ? 'none' : '0 4px 14px rgba(245,158,11,0.35)',
            }}>
            <Upload size={14} />
            {uploading ? 'Uploading…' : `Upload ${files.length} Photo${files.length > 1 ? 's' : ''}`}
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ── Manager Photo Card ────────────────────────────────────────────────────────
function ManagerPhotoCard({ photo, isDark, onDelete, onToggleFeatured, onToggleVisible }) {
  return (
    <div style={{ breakInside: 'avoid', marginBottom: 14 }}>
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: isDark ? '#1A1209' : '#FFFCF5',
        border: `1px solid ${isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.14)'}`,
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',
        opacity: photo.isVisible ? 1 : 0.5,
      }}>
        <div style={{ position: 'relative' }}>
          <img src={photo.imageUrl} alt={photo.caption}
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            loading="lazy"
          />
          {photo.isFeatured && (
            <div style={{
              position: 'absolute', top: 8, left: 8,
              background: 'linear-gradient(135deg, #F59E0B, #F97316)',
              borderRadius: 99, padding: '2px 9px',
              fontSize: 9, fontWeight: 800, color: '#fff',
              fontFamily: "'DM Sans', sans-serif",
            }}>✦ Featured</div>
          )}
          {!photo.isVisible && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              borderRadius: 8, padding: '3px 8px',
              fontSize: 9, fontWeight: 700, color: '#fff',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <EyeOff size={9} /> Hidden
            </div>
          )}
        </div>

        <div style={{ padding: '10px 12px 11px' }}>
          {photo.caption && (
            <p style={{
              fontSize: 11, margin: '0 0 8px', lineHeight: 1.5,
              color: isDark ? '#C9B99A' : '#3D2C1A',
              fontFamily: "'Lora', Georgia, serif",
              fontStyle: 'italic',
            }}>{photo.caption}</p>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <motion.button whileTap={{ scale: 0.88 }}
              onClick={() => onToggleFeatured(photo)}
              title={photo.isFeatured ? 'Unfeature' : 'Feature'}
              style={{
                flex: 1, borderRadius: 8, padding: '5px 0',
                background: photo.isFeatured
                  ? isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)'
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${photo.isFeatured
                  ? isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.20)'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                color: photo.isFeatured ? T.amber : isDark ? '#7A6550' : '#9CA3AF',
                fontFamily: "'DM Sans', sans-serif",
              }}>
              <Star size={10}
                fill={photo.isFeatured ? T.amber : 'none'}
                stroke={photo.isFeatured ? T.amber : isDark ? '#7A6550' : '#9CA3AF'}
              />
              {photo.isFeatured ? 'Featured' : 'Feature'}
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }}
              onClick={() => onToggleVisible(photo)}
              title={photo.isVisible ? 'Hide' : 'Show'}
              style={{
                flex: 1, borderRadius: 8, padding: '5px 0',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                color: isDark ? '#7A6550' : '#9CA3AF',
                fontFamily: "'DM Sans', sans-serif",
              }}>
              {photo.isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
              {photo.isVisible ? 'Visible' : 'Hidden'}
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }}
              onClick={() => onDelete(photo._id)}
              style={{
                borderRadius: 8, padding: '5px 9px',
                background: isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.06)',
                border: '1px solid rgba(244,63,94,0.15)',
                cursor: 'pointer', color: T.rose,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Trash2 size={12} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GalleryManagerPage() {
  const dispatch    = useDispatch()
  const { isDark }  = useContext(ThemeContext)

  const photos      = useSelector(selectPhotos)
  const loading     = useSelector(selectGalleryLoading)
  const hasMore     = useSelector(selectGalleryHasMore)
  const pagination  = useSelector(selectGalleryPagination)
  const activeCategory = useSelector(selectActiveCategory)

  const sentinelRef = useRef(null)
  const headerRef   = useRef(null)

  useEffect(() => {
    dispatch(fetchCategories())
    dispatch(fetchPhotos({ page: 1, limit: 20, category: 'all' }))
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }
    )
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasMore && !loading) {
        dispatch(fetchPhotos({
          page: (pagination?.page ?? 1) + 1, limit: 20,
        }))
      }
    }, { rootMargin: '200px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, pagination])

  const handleDelete = useCallback(async (photoId) => {
    if (!window.confirm('Delete this photo from Cloudinary and database?')) return
    dispatch(deletePhoto(photoId))
  }, [])

  const handleToggleFeatured = useCallback((photo) => {
    dispatch(updatePhoto({ photoId: photo._id, isFeatured: !photo.isFeatured }))
  }, [])

  const handleToggleVisible = useCallback((photo) => {
    dispatch(updatePhoto({ photoId: photo._id, isVisible: !photo.isVisible }))
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#0D0B09' : '#FAF7F0',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800;900&family=Lora:ital,wght@1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&display=swap');
        .mgal-masonry { columns: 1; column-gap: 12px; }
        @media (min-width: 600px)  { .mgal-masonry { columns: 2; } }
        @media (min-width: 960px)  { .mgal-masonry { columns: 3; } }
        @media (min-width: 1280px) { .mgal-masonry { columns: 4; } }
        @keyframes mgalPulse { 0%,100%{opacity:0.5} 50%{opacity:0.2} }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px 60px' }}>
        {/* Page header */}
        <div ref={headerRef} style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Camera size={18} color={T.amber} />
          </div>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 900, margin: 0,
              fontFamily: "'Fraunces', Georgia, serif",
              color: isDark ? '#FDE68A' : T.ink,
            }}>Gallery Management</h1>
            <p style={{
              fontSize: 11, margin: '2px 0 0',
              color: isDark ? '#7A6550' : '#9CA3AF',
              fontFamily: "'DM Sans', sans-serif",
            }}>Upload & manage cafe photos · {photos.length} photos</p>
          </div>
        </div>

        {/* Upload panel */}
        <UploadPanel isDark={isDark} onUploaded={() => {
          dispatch(fetchPhotos({ page: 1, limit: 20, category: 'all' }))
        }} />

        {/* Grid */}
        {loading && photos.length === 0 ? (
          <div className="mgal-masonry">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                breakInside: 'avoid', marginBottom: 14, borderRadius: 16,
                height: [180, 220, 160, 200][i % 4],
                background: isDark ? '#1A1209' : '#FFFCF5',
                animation: 'mgalPulse 1.8s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: isDark ? '#7A6550' : '#9CA3AF',
          }}>
            <Camera size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 700,
              fontFamily: "'Fraunces', Georgia, serif",
              color: isDark ? '#FDE68A' : T.ink, marginBottom: 4 }}>
              No photos uploaded yet
            </div>
            <div style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              Upload your first batch above 👆
            </div>
          </div>
        ) : (
          <div className="mgal-masonry">
            {photos.map((photo) => (
              <ManagerPhotoCard
                key={photo._id}
                photo={photo}
                isDark={isDark}
                onDelete={handleDelete}
                onToggleFeatured={handleToggleFeatured}
                onToggleVisible={handleToggleVisible}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  )
}