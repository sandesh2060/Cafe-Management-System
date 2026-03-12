// src/modules/customer/components/menu/MenuGrid.jsx
// Tailwind CSS — IntersectionObserver scroll-reveal for cards

import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import MenuCard from './MenuCard'

const BATCH_WINDOW_MS = 60  // reduced from 120 — faster flush on rapid scroll

export default function MenuGrid({ items }) {
  const gridRef  = useRef(null)
  const batchRef = useRef([])
  const timerRef = useRef(null)

  const flushBatch = useCallback(() => {
    const batch = batchRef.current.splice(0)
    if (!batch.length) return
    gsap.fromTo(
      batch,
      { y: 28, opacity: 0, scale: 0.96 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.48,
        ease: 'power3.out',
        stagger: batch.length > 1 ? 0.055 : 0,
        force3D: true,
        clearProps: 'transform,opacity',
      }
    )
  }, [])

  const reveal = useCallback((el, observer) => {
    observer.unobserve(el)
    batchRef.current.push(el)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flushBatch, BATCH_WINDOW_MS)
  }, [flushBatch])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const cards = Array.from(grid.querySelectorAll('.mc-wrap'))
    if (!cards.length) return

    gsap.killTweensOf(cards)
    clearTimeout(timerRef.current)
    batchRef.current = []
    gsap.set(cards, { y: 28, opacity: 0, scale: 0.96 })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) reveal(entry.target, observer)
        })
      },
      { rootMargin: '0px 0px -32px 0px', threshold: 0.06 }
    )

    cards.forEach(card => observer.observe(card))

    return () => {
      observer.disconnect()
      clearTimeout(timerRef.current)
    }
  }, [items, reveal])

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 gap-3 opacity-55">
        <span className="text-4xl">🍃</span>
        <p className="m-0 text-sm font-semibold text-[rgba(120,80,20,0.6)] text-center tracking-[-0.02em]">
          Nothing here yet
        </p>
      </div>
    )
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-3.5">
      {items.map(item => (
        <div key={item._id} className="mc mc-wrap">
          <MenuCard item={item} />
        </div>
      ))}
    </div>
  )
}