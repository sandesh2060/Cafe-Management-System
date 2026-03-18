// src/modules/customer/pages/GalleryPage.jsx
//
// ✅ Local T object (hardcoded hex) removed — all colors via var(--token) or getPalette()
// ✅ BRAND.name replaces hardcoded "Kausī Chiyā" in subtitle and empty state
// ✅ Page background gradient → var(--bg) + var(--orb-color) from brand
// ✅ Header bg/border → var(--header-bg), var(--header-border)
// ✅ Back button → var(--pill-bg), var(--text-secondary)
// ✅ Category pill active/inactive → var(--accent), var(--accent-dim), var(--accent-border)
// ✅ PhotoCard shadows → var(--card-shadow), card bg → var(--card-bg)
// ✅ Category badge in card → var(--accent-dim), var(--accent-border), var(--accent)
// ✅ Like button stroke → var(--divider) when not liked
// ✅ Loading spinner → var(--accent)
// ✅ Skeleton → var(--pill-bg)
// ✅ All animation, Redux, infinite scroll, lightbox logic unchanged

import { useEffect, useRef, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence }  from 'motion/react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate }              from 'react-router-dom'
import gsap                         from 'gsap'
import { ArrowLeft, Heart, X, ChevronLeft, ChevronRight, Camera, ZoomIn } from 'lucide-react'
import { ThemeContext }             from '@shared/context/ThemeContext'
import { BRAND, getPalette }        from '@shared/config/brand'
import {
  fetchPhotos, fetchCategories, likePhoto,
  setActiveCategory, optimisticLikePhoto,
  selectPhotos, selectCategories, selectGalleryLoading,
  selectGalleryHasMore, selectGalleryPagination, selectActiveCategory,
} from '@store/slices/gallerySlice'

// ── Category label map ────────────────────────────────────────────────────────
const CAT_LABELS = {
  all:      { label: 'All', emoji: '✨' },
  kitchen:  { label: 'Kitchen', emoji: '🍳' },
  food:     { label: 'Food', emoji: '☕' },
  ambience: { label: 'Ambience', emoji: '🪔' },
  event:    { label: 'Events', emoji: '🎉' },
  team:     { label: 'Team', emoji: '👥' },
  other:    { label: 'More', emoji: '📷' },
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onNav }) {
  const photo = photos[index]
  if (!photo) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'rgba(255,255,255,0.10)', border: 'none',
        borderRadius: '50%', width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#fff', zIndex: 1,
      }}>
        <X size={20} />
      </motion.button>

      {index > 0 && (
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={e => { e.stopPropagation(); onNav(index - 1) }}
          style={{
            position: 'absolute', left: 16, top: '50%',
            transform: 'translateY(-50%)', zIndex: 1,
            background: 'rgba(255,255,255,0.10)', border: 'none',
            borderRadius: 12, padding: '10px 8px', cursor: 'pointer', color: '#fff',
          }}>
          <ChevronLeft size={22} />
        </motion.button>
      )}
      {index < photos.length - 1 && (
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={e => { e.stopPropagation(); onNav(index + 1) }}
          style={{
            position: 'absolute', right: 16, top: '50%',
            transform: 'translateY(-50%)', zIndex: 1,
            background: 'rgba(255,255,255,0.10)', border: 'none',
            borderRadius: 12, padding: '10px 8px', cursor: 'pointer', color: '#fff',
          }}>
          <ChevronRight size={22} />
        </motion.button>
      )}

      <motion.div
        key={index}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: 'expo.out' }}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '80vh',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        <img src={photo.imageUrl} alt={photo.caption}
          style={{ maxWidth: '90vw', maxHeight: '80vh',
            objectFit: 'contain', display: 'block' }} />
      </motion.div>

      {photo.caption && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            marginTop: 16, textAlign: 'center',
            color: 'rgba(255,255,255,0.75)',
            fontSize: 13, maxWidth: 480, padding: '0 20px',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
          }}>
          {photo.caption}
        </motion.div>
      )}

      <div style={{
        position: 'absolute', bottom: 24,
        color: 'rgba(255,255,255,0.35)',
        fontSize: 11, fontFamily: "'DM Mono', monospace",
      }}>
        {index + 1} / {photos.length}
      </div>
    </motion.div>
  )
}

// ── Photo Card ────────────────────────────────────────────────────────────────
function PhotoCard({ photo, isDark, index, onLike, onOpen }) {
  const cardRef = useRef(null)
  // ✅ getPalette for values needed in non-CSS-var contexts (Heart stroke)
  const P = getPalette(isDark)

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 28, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1,
        duration: 0.5, delay: (index % 8) * 0.06,
        ease: 'back.out(1.3)' }
    )
  }, [])

  return (
    <div ref={cardRef} style={{ opacity: 0, breakInside: 'avoid', marginBottom: 14 }}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.22 }}
        style={{
          borderRadius: 16, overflow: 'hidden', position: 'relative',
          // ✅ var(--card-bg) — was hardcoded dark/light hex
          background: 'var(--card-bg)',
          // ✅ var(--card-shadow)
          boxShadow: 'var(--card-shadow)',
          cursor: 'pointer',
        }}
        onClick={() => onOpen(index)}
      >
        {/* Featured crown — semantic amber, intentionally fixed */}
        {photo.isFeatured && (
          <div style={{
            position: 'absolute', top: 9, left: 9, zIndex: 3,
            background: 'linear-gradient(135deg, #F59E0B, #F97316)',
            borderRadius: 99, padding: '3px 9px',
            fontSize: 9, fontWeight: 800, color: '#fff',
            letterSpacing: '0.3px',
          }}>✦ Featured</div>
        )}

        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <motion.img
            src={photo.imageUrl}
            alt={photo.caption}
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.45 }}
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(6px)',
              borderRadius: '50%', width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ZoomIn size={18} color="#fff" />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 12px 11px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Category pill — ✅ var tokens */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              borderRadius: 99, padding: '2px 8px', marginBottom: 5,
            }}>
              <span style={{ fontSize: 9 }}>
                {CAT_LABELS[photo.category]?.emoji ?? '📷'}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px',
                // ✅ var(--accent) — was T.amber hardcoded
                color: 'var(--accent)',
              }}>
                {CAT_LABELS[photo.category]?.label ?? photo.category}
              </span>
            </div>
            {photo.caption && (
              <p style={{
                fontSize: 12, margin: 0, lineHeight: 1.5,
                // ✅ var(--text-secondary) — was hardcoded #C9B99A / #3D2C1A
                color: 'var(--text-secondary)',
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{photo.caption}</p>
            )}
          </div>

          {/* Like button */}
          <motion.button
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.82 }}
            onClick={e => { e.stopPropagation(); onLike(photo._id) }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, flexShrink: 0,
            }}
          >
            <Heart size={17}
              // ✅ semantic rose for liked state (intentional fixed color — represents love/like)
              fill={photo._liked ? '#F43F5E' : 'none'}
              // ✅ var(--divider) for unloved state — was hardcoded #D1D5DB or #3D2C1A
              stroke={photo._liked ? '#F43F5E' : P.divider}
              strokeWidth={2}
            />
            {photo.likes > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                // ✅ semantic rose for liked, var(--text-muted) otherwise
                color: photo._liked ? '#F43F5E' : 'var(--text-muted)',
                fontFamily: "'DM Mono', monospace",
              }}>{photo.likes}</span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isDark } = useContext(ThemeContext)

  const photos     = useSelector(selectPhotos)
  const categories = useSelector(selectCategories)
  const loading    = useSelector(selectGalleryLoading)
  const hasMore    = useSelector(selectGalleryHasMore)
  const pagination = useSelector(selectGalleryPagination)
  const activeCategory = useSelector(selectActiveCategory)

  const [lightboxIdx, setLightboxIdx] = useState(null)
  const sentinelRef = useRef(null)
  const headerRef   = useRef(null)

  useEffect(() => {
    dispatch(fetchCategories())
    dispatch(fetchPhotos({ page: 1, limit: 20, category: activeCategory }))
  }, [activeCategory])

  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }
    )
  }, [])

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        dispatch(fetchPhotos({
          page: (pagination?.page ?? 1) + 1,
          limit: 20, category: activeCategory,
        }))
      }
    }, { rootMargin: '200px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, pagination, activeCategory])

  const handleLike = useCallback((photoId) => {
    dispatch(optimisticLikePhoto(photoId))
    dispatch(likePhoto(photoId))
  }, [])

  const handleCategoryChange = useCallback((cat) => {
    dispatch(setActiveCategory(cat))
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      // ✅ var(--bg) base + var(--orb-color) for ambient glow — was hardcoded rgba
      background: `radial-gradient(ellipse at ${isDark ? '70%' : '30%'} 0%, var(--orb-color) 0%, var(--bg) 55%)`,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        .gal-masonry { columns: 1; column-gap: 12px; }
        @media (min-width: 480px)  { .gal-masonry { columns: 2; } }
        @media (min-width: 780px)  { .gal-masonry { columns: 3; } }
        @media (min-width: 1100px) { .gal-masonry { columns: 4; } }
        @media (min-width: 1400px) { .gal-masonry { columns: 5; } }
        .cat-scroll { overflow-x: auto; scrollbar-width: none; }
        .cat-scroll::-webkit-scrollbar { display: none; }
        @keyframes galPulse { 0%,100%{opacity:0.5} 50%{opacity:0.2} }
        @keyframes galSpin  { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Header ── */}
      <div ref={headerRef} style={{
        position: 'sticky', top: 0, zIndex: 100,
        // ✅ var(--header-bg), var(--header-border) — was hardcoded rgba values
        background: 'var(--header-bg)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--header-border)',
      }}>
        <div style={{
          padding: '12px 18px 10px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            style={{
              // ✅ var(--pill-bg) — was hardcoded rgba(255,255,255,0.06) / rgba(0,0,0,0.05)
              background: 'var(--pill-bg)',
              border: 'none', borderRadius: 10, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              // ✅ var(--text-secondary) — was hardcoded #C9B99A / T.ink
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}>
            <ArrowLeft size={18} />
          </motion.button>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: 19, fontWeight: 900, margin: 0,
              fontFamily: "'Lora', Georgia, serif",
              // ✅ var(--text-primary) — was hardcoded #FDE68A / T.ink
              color: 'var(--text-primary)',
            }}>
              <Camera size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
              Our Gallery
            </h1>
            {/* ✅ BRAND.name — was hardcoded "Kausī Chiyā" */}
            <p style={{
              fontSize: 11, margin: '2px 0 0',
              color: 'var(--text-muted)',
            }}>
              Peek inside {BRAND.name}
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className="cat-scroll" style={{
          padding: '0 18px 12px',
          display: 'flex', gap: 8, flexWrap: 'nowrap',
        }}>
          {categories.map(({ _id, count }) => {
            const meta   = CAT_LABELS[_id] ?? { label: _id, emoji: '📷' }
            const active = activeCategory === _id
            return (
              <motion.button key={_id}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                onClick={() => handleCategoryChange(_id)}
                style={{
                  flexShrink: 0, borderRadius: 99, padding: '6px 14px',
                  // ✅ var tokens — was hardcoded T.amber, rgba values
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--pill-border)'}`,
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span style={{
                  fontSize: 10, opacity: 0.65,
                  fontFamily: "'DM Mono', monospace",
                }}>({count})</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '18px 14px 60px' }}>
        {loading && photos.length === 0 ? (
          <div className="gal-masonry">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                breakInside: 'avoid', marginBottom: 14,
                borderRadius: 16, overflow: 'hidden',
                // ✅ var(--pill-bg) — was hardcoded #1A1209 / #FFFCF5
                background: 'var(--pill-bg)',
                height: [180, 240, 160, 200, 220][i % 5],
                animation: 'galPulse 1.8s ease-in-out infinite',
                animationDelay: `${i * 0.09}s`,
              }} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            color: 'var(--text-muted)',
          }}>
            <Camera size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{
              fontSize: 16, fontWeight: 700, marginBottom: 6,
              fontFamily: "'Lora', Georgia, serif",
              color: 'var(--text-primary)',
            }}>No photos yet</div>
            {/* ✅ BRAND.emoji — was hardcoded 🍵 */}
            <div style={{ fontSize: 13 }}>
              Our manager is busy brewing great coffee {BRAND.emoji}
            </div>
          </div>
        ) : (
          <div className="gal-masonry">
            {photos.map((photo, i) => (
              <PhotoCard
                key={photo._id}
                photo={photo}
                isDark={isDark}
                index={i}
                onLike={handleLike}
                onOpen={setLightboxIdx}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />

        {loading && photos.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              // ✅ var(--accent), var(--accent-dim) — was hardcoded T.amber
              border: '2.5px solid var(--accent)',
              borderTopColor: 'var(--accent-dim)',
              display: 'inline-block',
              animation: 'galSpin 0.7s linear infinite',
            }} />
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            photos={photos}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onNav={setLightboxIdx}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  )
}