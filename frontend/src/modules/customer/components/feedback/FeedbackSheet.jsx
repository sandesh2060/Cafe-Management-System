// frontend/src/modules/customer/components/feedback/FeedbackSheet.jsx
//
// Module 21 — Post-Order Feedback Sheet
//
// A bottom sheet triggered after an order is delivered or paid.
// Distinct from ReviewsPage (cafe-level public reviews).
// This is private per-order feedback used by managers for analytics.
//
// Flow:
//   1. Overall star rating (required)
//   2. Per-item star ratings (optional, generated from order.items)
//   3. NPS question 0-10 (optional)
//   4. Quick tags (positive/negative)
//   5. Optional comment (max 500 chars)
//   6. Submit → POST /api/feedback
//
// Props:
//   isOpen    {boolean}
//   onClose   {function}
//   order     {object}  — the order to rate
//   onSuccess {function} — called after successful submission

import {
  useState, useEffect, useRef, useCallback,
  useContext, useMemo,
} from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { ThemeContext } from '@shared/context/ThemeContext'
import { getPalette, FONTS } from '@shared/config/brand'
import api from '@api/axios'
import { X, ChevronRight, Send, CheckCircle } from 'lucide-react'

// ── Tag taxonomy ──────────────────────────────────────────────────────────────
const POS_TAGS = [
  { key: 'delicious',      label: '😋 Delicious'       },
  { key: 'fresh',          label: '🌿 Fresh'           },
  { key: 'great_value',    label: '💰 Great value'     },
  { key: 'fast_service',   label: '⚡ Fast service'    },
  { key: 'perfect_portion',label: '🍽️ Perfect portion' },
  { key: 'loved_it',       label: '❤️ Loved it'        },
]

const NEG_TAGS = [
  { key: 'too_slow',       label: '🐢 Too slow'        },
  { key: 'wrong_order',    label: '❌ Wrong order'      },
  { key: 'cold_food',      label: '🥶 Cold food'       },
  { key: 'small_portion',  label: '😔 Small portion'   },
  { key: 'overpriced',     label: '💸 Overpriced'      },
  { key: 'rude_staff',     label: '😤 Rude staff'      },
]

const NPS_LABELS = {
  0: 'Never', 1: 'Very unlikely', 2: 'Unlikely', 3: 'Probably not',
  4: 'Doubtful', 5: 'Neutral', 6: 'Maybe', 7: 'Probably',
  8: 'Likely', 9: 'Very likely', 10: 'Definitely!',
}

// ── Star component ────────────────────────────────────────────────────────────
const Star = ({ filled, size = 28, onClick, onHover }) => (
  <button type="button" onClick={onClick} onMouseEnter={onHover}
    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? '#F59E0B' : 'none'}
      stroke={filled ? '#F59E0B' : 'var(--divider)'}
      strokeWidth="1.8">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  </button>
)

// ── StarRow picker ────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange, size = 28 }) => {
  const [hov, setHov] = useState(0)
  const refs = useRef([])
  const active = hov || value

  const bounce = (i) => {
    const el = refs.current[i]
    if (!el) return
    gsap.fromTo(el, { scale: 1 }, { scale: 1.35, duration: 0.12, yoyo: true, repeat: 1, ease: 'back.out(4)' })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      onMouseLeave={() => setHov(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} ref={el => refs.current[n - 1] = el} style={{ display: 'flex' }}>
          <Star
            filled={active >= n}
            size={size}
            onClick={() => { onChange(n); bounce(n - 1) }}
            onHover={() => setHov(n)}
          />
        </span>
      ))}
    </div>
  )
}

// ── NPS dot picker ────────────────────────────────────────────────────────────
const NpsPicker = ({ value, onChange }) => {
  const color = value === null ? 'var(--text-muted)'
    : value >= 9 ? '#22C55E'
    : value >= 7 ? '#F59E0B'
    : '#F43F5E'

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
            style={{
              flex: '0 0 auto',
              width: 32, height: 32, borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              fontFamily: FONTS.body,
              background: value === n
                ? (n >= 9 ? '#22C55E' : n >= 7 ? '#F59E0B' : '#F43F5E')
                : 'var(--pill-bg)',
              color: value === n ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: '#F43F5E', fontFamily: FONTS.body }}>Not at all</span>
        <span style={{ fontSize: 9, color: '#22C55E', fontFamily: FONTS.body }}>Definitely!</span>
      </div>
      {value !== null && (
        <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color, fontFamily: FONTS.body, textAlign: 'center' }}>
          {NPS_LABELS[value]}
        </p>
      )}
    </div>
  )
}

// ── Tag chip ──────────────────────────────────────────────────────────────────
const TagChip = ({ tag, selected, onToggle, positive }) => {
  const ac = positive ? '#22C55E' : '#F43F5E'
  return (
    <button type="button" onClick={() => onToggle(tag.key)}
      style={{
        padding: '5px 11px', borderRadius: 20, border: `1px solid ${selected ? ac : 'var(--divider)'}`,
        background: selected ? `${ac}14` : 'var(--pill-bg)',
        color: selected ? ac : 'var(--text-muted)',
        fontSize: 11, fontWeight: selected ? 700 : 500,
        cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: FONTS.body, whiteSpace: 'nowrap',
      }}>
      {tag.label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
const FeedbackSheet = ({ isOpen, onClose, order, onSuccess }) => {
  const { isDark: D } = useContext(ThemeContext)
  const P = getPalette(D)

  // ── State ─────────────────────────────────────────────────────────────────
  const [step,           setStep]          = useState(0)      // 0=overall, 1=items, 2=nps, 3=tags, 4=comment
  const [overallRating,  setOverallRating] = useState(0)
  const [itemRatings,    setItemRatings]   = useState({})     // { menuItemId: { rating, tags: [] } }
  const [npsScore,       setNpsScore]      = useState(null)
  const [tags,           setTags]          = useState([])     // overall tags
  const [comment,        setComment]       = useState('')
  const [submitting,     setSubmitting]    = useState(false)
  const [error,          setError]         = useState('')
  const [submitted,      setSubmitted]     = useState(false)

  const overlayRef = useRef(null)
  const sheetRef   = useRef(null)
  const contentRef = useRef(null)

  const items = useMemo(() => order?.items ?? [], [order])
  const STEPS = ['Overall', 'Items', 'NPS', 'Tags', 'Comment']

  // ── Animations ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !overlayRef.current || !sheetRef.current) return
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 })
    gsap.fromTo(sheetRef.current, { y: '100%' }, { y: '0%', duration: 0.42, ease: 'power3.out' })
    // Reset state on open
    setStep(0); setOverallRating(0); setItemRatings({})
    setNpsScore(null); setTags([]); setComment('')
    setError(''); setSubmitted(false)
  }, [isOpen])

  const dismiss = useCallback(() => {
    if (!overlayRef.current || !sheetRef.current) { onClose(); return }
    gsap.to(sheetRef.current, { y: '100%', duration: 0.28, ease: 'power3.in' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.22, onComplete: onClose })
  }, [onClose])

  // Animate step change
  const goStep = useCallback((next) => {
    if (!contentRef.current) { setStep(next); return }
    gsap.to(contentRef.current, {
      opacity: 0, x: next > step ? -20 : 20, duration: 0.15, ease: 'power2.in',
      onComplete: () => {
        setStep(next)
        gsap.fromTo(contentRef.current, { opacity: 0, x: next > step ? 20 : -20 }, { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' })
      },
    })
  }, [step])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleTag = useCallback((key) => {
    setTags(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }, [])

  const setItemRating = useCallback((menuItemId, rating) => {
    setItemRatings(prev => ({ ...prev, [menuItemId]: { ...(prev[menuItemId] ?? {}), rating } }))
  }, [])

  const toggleItemTag = useCallback((menuItemId, tag) => {
    setItemRatings(prev => {
      const cur  = prev[menuItemId] ?? {}
      const tags = cur.tags ?? []
      return {
        ...prev,
        [menuItemId]: {
          ...cur,
          tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag],
        },
      }
    })
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!overallRating) { setError('Please rate your overall experience'); return }
    setSubmitting(true); setError('')
    try {
      const payload = {
        orderId: order._id,
        overallRating,
        npsScore,
        tags,
        comment: comment.trim() || null,
        itemRatings: Object.entries(itemRatings)
          .filter(([, v]) => v.rating)
          .map(([menuItemId, v]) => {
            const item = items.find(i => i.menuItemId.toString() === menuItemId || i.menuItemId === menuItemId)
            return {
              menuItemId,
              name:   item?.name ?? null,
              emoji:  item?.emoji ?? '🍽️',
              rating: v.rating,
              tags:   v.tags ?? [],
            }
          }),
      }
      await api.post('/feedback', payload)
      setSubmitted(true)
      gsap.fromTo(sheetRef.current, { boxShadow: '0 -24px 60px rgba(34,197,94,0)' }, { boxShadow: '0 -24px 60px rgba(34,197,94,0.3)', duration: 0.3, yoyo: true, repeat: 1 })
      setTimeout(() => { onSuccess?.(); dismiss() }, 1800)
    } catch (e) {
      const msg = e.response?.data?.message ?? 'Failed to submit feedback'
      if (e.response?.status === 409) {
        setError('You have already submitted feedback for this order')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }, [overallRating, order, npsScore, tags, comment, itemRatings, items, dismiss, onSuccess])

  if (!isOpen) return null

  const canAdvance = step === 0 ? overallRating > 0 : true
  const isLast     = step === STEPS.length - 1

  // ── Render ────────────────────────────────────────────────────────────────
  return createPortal(
    <div ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={e => e.target === overlayRef.current && dismiss()}>

      <div ref={sheetRef}
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90dvh',
          overflowY: 'auto',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.35)',
          fontFamily: FONTS.body,
        }}>

        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--divider)', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: FONTS.heading }}>
              {submitted ? 'Thank you! 🙏' : 'How was your order?'}
            </h2>
            {!submitted && (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Your feedback helps us improve
              </p>
            )}
          </div>
          <button onClick={dismiss}
            style={{ background: 'var(--pill-bg)', border: '1px solid var(--divider)', borderRadius: 10, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Success state */}
        {submitted ? (
          <div style={{ padding: '20px 20px 40px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle size={28} style={{ color: '#22C55E' }} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Feedback submitted!</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>We appreciate you taking the time.</p>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 4, padding: '0 20px 14px' }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{
                  flex: 1, height: 3, borderRadius: 99, transition: 'background 0.3s',
                  background: i <= step ? P.accent : 'var(--divider)',
                }} />
              ))}
            </div>

            {/* Step content */}
            <div ref={contentRef} style={{ padding: '0 20px', minHeight: 200 }}>

              {/* Step 0: Overall rating */}
              {step === 0 && (
                <div>
                  <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Overall experience
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <StarPicker value={overallRating} onChange={setOverallRating} size={38} />
                  </div>
                  {overallRating > 0 && (
                    <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: P.accent, margin: 0 }}>
                      {['', 'Poor 😔', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent 🤩'][overallRating]}
                    </p>
                  )}
                </div>
              )}

              {/* Step 1: Per-item ratings */}
              {step === 1 && (
                <div>
                  <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Rate each item
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {items.map(item => {
                      const id = item.menuItemId?.toString() ?? item.menuItemId
                      const cur = itemRatings[id] ?? {}
                      return (
                        <div key={id} style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 22 }}>{item.emoji ?? '🍽️'}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</p>
                              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>×{item.quantity}</p>
                            </div>
                          </div>
                          <StarPicker value={cur.rating ?? 0} onChange={r => setItemRating(id, r)} size={24} />
                          {cur.rating && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                              {(cur.rating >= 4 ? POS_TAGS : NEG_TAGS).slice(0, 3).map(t => (
                                <TagChip key={t.key} tag={t} positive={cur.rating >= 4}
                                  selected={(cur.tags ?? []).includes(t.key)}
                                  onToggle={tag => toggleItemTag(id, tag)} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: NPS */}
              {step === 2 && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Would you recommend us?
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    On a scale of 0–10, how likely are you to recommend us to a friend?
                  </p>
                  <NpsPicker value={npsScore} onChange={setNpsScore} />
                </div>
              )}

              {/* Step 3: Tags */}
              {step === 3 && (
                <div>
                  <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    What stood out?
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#22C55E' }}>Highlights</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {POS_TAGS.map(t => <TagChip key={t.key} tag={t} positive selected={tags.includes(t.key)} onToggle={toggleTag} />)}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#F43F5E' }}>Areas to improve</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {NEG_TAGS.map(t => <TagChip key={t.key} tag={t} positive={false} selected={tags.includes(t.key)} onToggle={toggleTag} />)}
                  </div>
                </div>
              )}

              {/* Step 4: Comment */}
              {step === 4 && (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Anything else? <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(optional)</span>
                  </p>
                  <textarea value={comment} onChange={e => setComment(e.target.value)}
                    rows={4} maxLength={500}
                    placeholder="Tell us more about your experience…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '12px', borderRadius: 12, resize: 'none',
                      background: 'var(--input-bg)',
                      border: '1.5px solid var(--input-border)',
                      color: 'var(--text-primary)',
                      fontSize: 13, fontFamily: FONTS.body,
                      outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = P.accent}
                    onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                  />
                  <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {comment.length}/500
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: '10px 20px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', fontSize: 12, color: '#F43F5E', fontFamily: FONTS.body }}>
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: 10, padding: '16px 20px 0' }}>
              {step > 0 && (
                <button onClick={() => goStep(step - 1)}
                  style={{
                    flex: '0 0 auto', padding: '12px 18px', borderRadius: 12,
                    background: 'var(--pill-bg)', border: '1px solid var(--divider)',
                    color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONTS.body,
                  }}>
                  ← Back
                </button>
              )}

              {isLast ? (
                <button onClick={submit} disabled={submitting || !overallRating}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                    background: overallRating ? `linear-gradient(135deg, ${P.accent}, ${P.accentDark})` : 'var(--pill-bg)',
                    color: overallRating ? '#fff' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: overallRating ? `0 6px 20px ${P.accentGlow}` : 'none',
                    fontFamily: FONTS.body,
                    opacity: submitting ? 0.7 : 1,
                  }}>
                  <Send size={14} />
                  {submitting ? 'Submitting…' : 'Submit Feedback'}
                </button>
              ) : (
                <button onClick={() => canAdvance && goStep(step + 1)} disabled={!canAdvance}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                    background: canAdvance ? `linear-gradient(135deg, ${P.accent}, ${P.accentDark})` : 'var(--pill-bg)',
                    color: canAdvance ? '#fff' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 700,
                    cursor: canAdvance ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: canAdvance ? `0 6px 20px ${P.accentGlow}` : 'none',
                    fontFamily: FONTS.body,
                  }}>
                  {step === 0 && !overallRating ? 'Select a rating to continue' : 'Continue'}
                  {canAdvance && <ChevronRight size={14} />}
                </button>
              )}
            </div>

            {/* Skip to end on step 0 */}
            {step === 0 && overallRating > 0 && (
              <button onClick={submit} disabled={submitting}
                style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: FONTS.body }}>
                Skip questions & submit
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default FeedbackSheet