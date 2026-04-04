// src/modules/customer/pages/GalleryPage.jsx
// v2 — Full Tailwind CSS + CSS vars, navigate(-1) fixed
// ✅ All colors via var(--token) from brand.js / ThemeContext
// ✅ navigate(-1) — no window.history.state guard
// ✅ BRAND.name, BRAND.emoji replace hardcoded strings
// ✅ All Redux, infinite scroll, lightbox, GSAP unchanged

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

const CAT_LABELS = {
  all:      { label:'All',      emoji:'✨' },
  kitchen:  { label:'Kitchen',  emoji:'🍳' },
  food:     { label:'Food',     emoji:'☕' },
  ambience: { label:'Ambience', emoji:'🪔' },
  event:    { label:'Events',   emoji:'🎉' },
  team:     { label:'Team',     emoji:'👥' },
  other:    { label:'More',     emoji:'📷' },
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onNav }) {
  const photo = photos[index]
  if (!photo) return null

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background:'rgba(0,0,0,0.92)', backdropFilter:'blur(12px)' }}
      onClick={onClose}>

      {/* Close */}
      <motion.button whileTap={{ scale:0.88 }} onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer z-[1] text-white border-none"
        style={{ background:'rgba(255,255,255,0.10)' }}>
        <X size={20}/>
      </motion.button>

      {/* Prev */}
      {index > 0 && (
        <motion.button whileTap={{ scale:0.9 }}
          onClick={e => { e.stopPropagation(); onNav(index-1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-[1] text-white border-none cursor-pointer px-2 py-2.5 rounded-xl"
          style={{ background:'rgba(255,255,255,0.10)' }}>
          <ChevronLeft size={22}/>
        </motion.button>
      )}
      {/* Next */}
      {index < photos.length-1 && (
        <motion.button whileTap={{ scale:0.9 }}
          onClick={e => { e.stopPropagation(); onNav(index+1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-[1] text-white border-none cursor-pointer px-2 py-2.5 rounded-xl"
          style={{ background:'rgba(255,255,255,0.10)' }}>
          <ChevronRight size={22}/>
        </motion.button>
      )}

      {/* Image */}
      <motion.div
        key={index}
        initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        transition={{ duration:0.28, ease:'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl overflow-hidden"
        style={{ maxWidth:'90vw', maxHeight:'80vh', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
        <img src={photo.imageUrl} alt={photo.caption}
          style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain', display:'block' }}/>
      </motion.div>

      {/* Caption */}
      {photo.caption && (
        <motion.p
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
          className="mt-4 text-center text-[13px] max-w-[480px] px-5 italic"
          style={{ color:'rgba(255,255,255,0.75)', fontFamily:"'Lora',Georgia,serif" }}>
          {photo.caption}
        </motion.p>
      )}

      {/* Counter */}
      <div className="absolute bottom-6 text-[11px]"
        style={{ color:'rgba(255,255,255,0.35)', fontFamily:"'DM Mono',monospace" }}>
        {index+1} / {photos.length}
      </div>
    </motion.div>
  )
}

// ── Photo Card ────────────────────────────────────────────────────────────────
function PhotoCard({ photo, isDark, index, onLike, onOpen }) {
  const cardRef = useRef(null)
  const P = getPalette(isDark)

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity:0, y:28, scale:0.92 },
      { opacity:1, y:0, scale:1, duration:0.5, delay:(index%8)*0.06, ease:'back.out(1.3)' })
  }, []) // eslint-disable-line

  return (
    <div ref={cardRef} style={{ opacity:0, breakInside:'avoid', marginBottom:14 }}>
      <motion.div
        whileHover={{ y:-4 }} transition={{ duration:0.22 }}
        className="rounded-2xl overflow-hidden relative cursor-pointer"
        style={{ background:'var(--card-bg)', boxShadow:'var(--card-shadow)' }}
        onClick={() => onOpen(index)}>

        {/* Featured badge */}
        {photo.isFeatured && (
          <div className="absolute top-2 left-2 z-[3] text-white text-[9px] font-extrabold tracking-[0.3px] px-2 py-0.5 rounded-full"
            style={{ background:'linear-gradient(135deg,#F59E0B,#F97316)' }}>
            ✦ Featured
          </div>
        )}

        <div className="relative overflow-hidden">
          <motion.img
            src={photo.imageUrl} alt={photo.caption} loading="lazy"
            whileHover={{ scale:1.05 }} transition={{ duration:0.45 }}
            className="w-full block object-cover"/>
          <motion.div
            initial={{ opacity:0 }} whileHover={{ opacity:1 }} transition={{ duration:0.2 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background:'rgba(0,0,0,0.35)' }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background:'rgba(255,255,255,0.18)', backdropFilter:'blur(6px)' }}>
              <ZoomIn size={18} color="#fff"/>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 flex items-end justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Category pill */}
            <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 mb-1.5"
              style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)' }}>
              <span className="text-[9px]">{CAT_LABELS[photo.category]?.emoji ?? '📷'}</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.5px]" style={{ color:'var(--accent)' }}>
                {CAT_LABELS[photo.category]?.label ?? photo.category}
              </span>
            </div>
            {photo.caption && (
              <p className="text-[12px] m-0 leading-[1.5] italic"
                style={{
                  color:'var(--text-secondary)',
                  fontFamily:"'Lora',Georgia,serif",
                  overflow:'hidden', display:'-webkit-box',
                  WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                }}>
                {photo.caption}
              </p>
            )}
          </div>

          {/* Like btn */}
          <motion.button
            whileHover={{ scale:1.15 }} whileTap={{ scale:0.82 }}
            onClick={e => { e.stopPropagation(); onLike(photo._id) }}
            className="bg-transparent border-none cursor-pointer flex flex-col items-center gap-0.5 flex-shrink-0">
            <Heart size={17}
              fill={photo._liked ? '#F43F5E' : 'none'}
              stroke={photo._liked ? '#F43F5E' : P.divider}
              strokeWidth={2}/>
            {photo.likes > 0 && (
              <span className="text-[9px] font-bold"
                style={{ color:photo._liked ? '#F43F5E' : 'var(--text-muted)', fontFamily:"'DM Mono',monospace" }}>
                {photo.likes}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const dispatch      = useDispatch()
  const navigate      = useNavigate()
  const { isDark }    = useContext(ThemeContext)
  const photos        = useSelector(selectPhotos)
  const categories    = useSelector(selectCategories)
  const loading       = useSelector(selectGalleryLoading)
  const hasMore       = useSelector(selectGalleryHasMore)
  const pagination    = useSelector(selectGalleryPagination)
  const activeCategory= useSelector(selectActiveCategory)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const sentinelRef   = useRef(null)
  const headerRef     = useRef(null)

  useEffect(() => {
    dispatch(fetchCategories())
    dispatch(fetchPhotos({ page:1, limit:20, category:activeCategory }))
  }, [activeCategory]) // eslint-disable-line

  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(headerRef.current,
      { opacity:0, y:-16 },
      { opacity:1, y:0, duration:0.6, ease:'expo.out' })
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading)
        dispatch(fetchPhotos({ page:(pagination?.page??1)+1, limit:20, category:activeCategory }))
    }, { rootMargin:'200px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, pagination, activeCategory]) // eslint-disable-line

  const handleLike = useCallback(id => {
    dispatch(optimisticLikePhoto(id))
    dispatch(likePhoto(id))
  }, [dispatch])

  const handleCategoryChange = useCallback(cat => {
    dispatch(setActiveCategory(cat))
  }, [dispatch])

  return (
    <div className="min-h-screen" style={{ background:'var(--bg)', fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        .gal-masonry { columns:1; column-gap:12px; }
        @media(min-width:480px)  { .gal-masonry { columns:2; } }
        @media(min-width:780px)  { .gal-masonry { columns:3; } }
        @media(min-width:1100px) { .gal-masonry { columns:4; } }
        @media(min-width:1400px) { .gal-masonry { columns:5; } }
        .cat-scroll { overflow-x:auto; scrollbar-width:none; }
        .cat-scroll::-webkit-scrollbar { display:none; }
        @keyframes galPulse { 0%,100%{opacity:0.5} 50%{opacity:0.2} }
        @keyframes galSpin  { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Header ── */}
      <div ref={headerRef} className="sticky top-0 z-[100]"
        style={{
          background:'var(--header-bg)',
          backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
          borderBottom:'1px solid var(--header-border)',
        }}>
        <div className="flex items-center gap-3.5 px-[18px] pt-3 pb-2.5">
          {/* ✅ navigate(-1) — no history.state guard */}
          <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer flex-shrink-0 border-none"
            style={{ background:'var(--pill-bg)', color:'var(--text-secondary)' }}>
            <ArrowLeft size={18}/>
          </motion.button>
          <div className="flex-1">
            <h1 className="text-[19px] font-black m-0" style={{ color:'var(--text-primary)', fontFamily:"'Lora',Georgia,serif" }}>
              <Camera size={16} style={{ verticalAlign:'middle', marginRight:7 }}/>
              Our Gallery
            </h1>
            <p className="text-[11px] m-0 mt-0.5" style={{ color:'var(--text-muted)' }}>
              Peek inside {BRAND.name}
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className="cat-scroll flex gap-2 px-[18px] pb-3" style={{ flexWrap:'nowrap' }}>
          {categories.map(({ _id, count }) => {
            const meta   = CAT_LABELS[_id] ?? { label:_id, emoji:'📷' }
            const active = activeCategory === _id
            return (
              <motion.button key={_id}
                whileHover={{ scale:1.05 }} whileTap={{ scale:0.93 }}
                onClick={() => handleCategoryChange(_id)}
                className="flex-shrink-0 rounded-full text-[12px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors duration-150"
                style={{
                  padding:'6px 14px',
                  border:`1.5px solid ${active ? 'var(--accent)' : 'var(--pill-border)'}`,
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-65" style={{ fontFamily:"'DM Mono',monospace" }}>({count})</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-[1500px] mx-auto px-3.5 pt-[18px] pb-16">

        {/* Skeleton */}
        {loading && photos.length === 0 ? (
          <div className="gal-masonry">
            {Array.from({ length:12 }).map((_,i) => (
              <div key={i} className="rounded-2xl overflow-hidden"
                style={{
                  breakInside:'avoid', marginBottom:14,
                  background:'var(--pill-bg)',
                  height:[180,240,160,200,220][i%5],
                  animation:'galPulse 1.8s ease-in-out infinite',
                  animationDelay:`${i*0.09}s`,
                }}/>
            ))}
          </div>

        /* Empty */
        ) : photos.length === 0 ? (
          <div className="text-center py-20 px-5" style={{ color:'var(--text-muted)' }}>
            <Camera size={40} className="mx-auto opacity-30 mb-3"/>
            <div className="text-[16px] font-bold mb-1.5" style={{ color:'var(--text-primary)', fontFamily:"'Lora',Georgia,serif" }}>
              No photos yet
            </div>
            <div className="text-[13px]">Our manager is busy brewing great coffee {BRAND.emoji}</div>
          </div>

        /* Grid */
        ) : (
          <div className="gal-masonry">
            {photos.map((photo, i) => (
              <PhotoCard key={photo._id} photo={photo} isDark={isDark}
                index={i} onLike={handleLike} onOpen={setLightboxIdx}/>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-px"/>

        {/* Load more spinner */}
        {loading && photos.length > 0 && (
          <div className="text-center py-5">
            <div className="inline-block w-[26px] h-[26px] rounded-full"
              style={{
                border:'2.5px solid var(--accent)',
                borderTopColor:'var(--accent-dim)',
                animation:'galSpin 0.7s linear infinite',
              }}/>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox photos={photos} index={lightboxIdx}
            onClose={() => setLightboxIdx(null)} onNav={setLightboxIdx}/>
        )}
      </AnimatePresence>
    </div>
  )
}