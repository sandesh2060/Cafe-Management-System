// src/modules/manager/components/tables/TableManagementPanel.jsx
// Perfect responsive: mobile → single col cards, tablet → 2 col, desktop → 3 col
// GPS flow: walk to table → Use My Location → lock → fill form → save
// NearestTable radar: live watchPosition → haversine → nearest highlight

import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { ThemeContext } from '@shared/context/ThemeContext'
import api from '@api/axios'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { COLORS } from '@colors'
import {
  Navigation, MapPin, Plus, X, Check, Edit3,
  Trash2, QrCode, Users, Maximize2, RefreshCw,
  Loader, CheckCircle, AlertCircle, Radar,
} from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────
const ZONES    = ['Indoor', 'Outdoor', 'Terrace']
const ZONE_CLR = {
  Indoor:  '#7C3AED',
  Outdoor: '#2D9B5A',
  Terrace: '#FF9F1C',
}
const ZONE_EMOJI = { Indoor: '🏠', Outdoor: '🌿', Terrace: '☀️' }
const C = { s: '#FF9F1C', t: '#E05C2A', m: '#2D9B5A' }

const ACC_GOOD = 6
const ACC_OK   = 15

const accColor = (a) => a == null ? '#888' : a <= ACC_GOOD ? C.m : a <= ACC_OK ? C.s : C.t
const accLabel = (a) =>
  a == null       ? 'No signal'
  : a <= ACC_GOOD ? `±${a.toFixed(1)}m · Excellent`
  : a <= ACC_OK   ? `±${a.toFixed(1)}m · Good`
  : `±${a.toFixed(1)}m · Move to open area`

const fmtCoord = (n) => (typeof n === 'number' ? n.toFixed(5) : '—')

// ─── Haversine distance (meters) ─────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const glass = (isDark, extra = {}) => ({
  background: isDark
    ? 'linear-gradient(145deg,rgba(26,14,6,0.94),rgba(16,9,3,0.82))'
    : 'linear-gradient(145deg,rgba(255,254,250,0.98),rgba(242,236,218,0.7))',
  backdropFilter: 'blur(28px) saturate(1.7)',
  border: `1px solid ${isDark ? 'rgba(255,159,28,0.12)' : 'rgba(255,159,28,0.2)'}`,
  borderRadius: 20,
  boxShadow: isDark
    ? '0 8px 40px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.03)'
    : '0 8px 40px rgba(60,30,10,0.09),inset 0 1px 0 rgba(255,255,255,0.9)',
  ...extra,
})

const fieldLabel = (isDark) => ({
  display: 'block', fontSize: 10, fontWeight: 700, marginBottom: 6,
  letterSpacing: '0.6px', textTransform: 'uppercase',
  color: isDark ? '#6B4F35' : '#B09070', fontFamily: 'DM Sans,sans-serif',
})

const inputBase = (isDark) => ({
  width: '100%', padding: '10px 13px', borderRadius: 11, outline: 'none',
  border: `1.5px solid ${isDark ? 'rgba(255,159,28,0.15)' : 'rgba(200,130,40,0.2)'}`,
  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
  color: isDark ? '#FFF8EE' : '#1A0E04',
  fontSize: 13, fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box',
  transition: 'border-color 0.18s, box-shadow 0.18s',
})

// ─── Nearest Table Radar ──────────────────────────────────────────────────────
const NearestTableRadar = ({ tables, isDark }) => {
  const [myPos,   setMyPos]   = useState(null)
  const [nearest, setNearest] = useState(null)
  const [ranked,  setRanked]  = useState([])
  const [active,  setActive]  = useState(false)
  const [gpsErr,  setGpsErr]  = useState('')
  const watchRef  = useRef(null)
  const cardRef   = useRef(null)
  const nearRef   = useRef(null)
  const prevIdRef = useRef(null)

  // compute nearest whenever position or tables change
  const compute = useCallback((lat, lng) => {
    if (!tables.length) return
    const withDist = tables.map(t => ({
      ...t,
      dist: haversine(lat, lng, t.lat, t.lng),
    })).sort((a, b) => a.dist - b.dist)
    setRanked(withDist)
    const top = withDist[0]
    setNearest(top)
    // animate card if nearest changed
    if (nearRef.current && top._id !== prevIdRef.current) {
      prevIdRef.current = top._id
      gsap.fromTo(nearRef.current,
        { scale: 0.93, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' }
      )
    }
  }, [tables])

  const start = () => {
    if (!navigator.geolocation) { setGpsErr('Geolocation not supported'); return }
    setGpsErr('')
    setActive(true)
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        setMyPos({ lat, lng })
        compute(lat, lng)
      },
      (err) => {
        setGpsErr(err.code === 1 ? 'Allow location to use radar' : 'GPS unavailable')
        setActive(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    )
  }

  const stop = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    setActive(false); setMyPos(null); setNearest(null); setRanked([])
  }

  // recompute when tables list changes while active
  useEffect(() => {
    if (myPos) compute(myPos.lat, myPos.lng)
  }, [tables, compute])

  useEffect(() => () => stop(), [])

  // entrance animation
  useEffect(() => {
    if (cardRef.current)
      gsap.fromTo(cardRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' })
  }, [])

  const distLabel = (d) =>
    d < 1 ? `${Math.round(d * 100) / 10}cm`
    : d < 1000 ? `${d.toFixed(1)}m`
    : `${(d / 1000).toFixed(2)}km`

  const proximity = (d, r) => {
    if (d <= r) return { label: 'You are HERE', color: C.m, pulse: true }
    if (d <= r * 2) return { label: 'Very close', color: C.s }
    if (d <= 10)    return { label: 'Nearby', color: '#4A9EFF' }
    return { label: `${distLabel(d)} away`, color: isDark ? '#6B4F35' : '#A07850' }
  }

  return (
    <div ref={cardRef} style={{ ...glass(isDark), padding: '18px 20px', marginBottom: 20, overflow: 'hidden', position: 'relative' }}>

      {/* Subtle radar bg decoration */}
      {active && (
        <div style={{
          position: 'absolute', right: -30, top: -30,
          width: 160, height: 160, borderRadius: '50%',
          border: `1px solid ${C.s}15`,
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `1px solid ${C.s}10` }} />
          <div style={{ position: 'absolute', inset: 50, borderRadius: '50%', border: `1px solid ${C.s}08` }} />
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: active
              ? `linear-gradient(135deg,${C.s},${C.t})`
              : isDark ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: active ? `0 4px 14px ${C.s}44` : 'none',
            transition: 'all 0.3s',
          }}>
            <Radar size={16} color={active ? '#fff' : C.s}
              style={active ? { animation: 'radar-spin 3s linear infinite' } : {}} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, margin: 0,
              fontFamily: 'DM Sans,sans-serif', color: isDark ? '#FFF8EE' : '#1A0E04' }}>
              Nearest Table Radar
            </p>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif' }}>
              {active ? 'Live tracking your position…' : 'Find which table you\'re standing at'}
            </p>
          </div>
        </div>

        {active ? (
          <button onClick={stop} className="btn-compact" style={{
            padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#9E7D5A' : '#7A5C3A',
            fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <X size={11} /> Stop
          </button>
        ) : (
          <button onClick={start} className="btn-compact" disabled={!tables.length} style={{
            padding: '7px 14px', borderRadius: 10, border: 'none',
            cursor: tables.length ? 'pointer' : 'not-allowed',
            background: tables.length
              ? `linear-gradient(135deg,${C.s},${C.t})`
              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            color: tables.length ? '#fff' : isDark ? '#4A3520' : '#C0A080',
            fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif',
            boxShadow: tables.length ? `0 4px 14px ${C.s}40` : 'none',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Navigation size={11} />
            {tables.length ? 'Start Radar' : 'No tables yet'}
          </button>
        )}
      </div>

      {/* GPS error */}
      {gpsErr && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 12,
          background: isDark ? 'rgba(224,92,42,0.1)' : '#FEF5F0',
          border: '1px solid rgba(224,92,42,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={13} color={C.t} />
          <span style={{ fontSize: 12, color: C.t, fontFamily: 'DM Sans,sans-serif' }}>{gpsErr}</span>
        </div>
      )}

      {/* Inactive placeholder */}
      {!active && !gpsErr && (
        <div style={{
          padding: '14px', borderRadius: 14, textAlign: 'center',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px dashed ${isDark ? 'rgba(255,159,28,0.12)' : 'rgba(255,159,28,0.2)'}`,
        }}>
          <p style={{ fontSize: 12, color: isDark ? '#4A3520' : '#C0A080',
            fontFamily: 'DM Sans,sans-serif', margin: 0 }}>
            Walk around the café → radar shows the closest table in real time
          </p>
        </div>
      )}

      {/* Active: nearest hero card */}
      {active && nearest && (
        <div ref={nearRef}>
          {/* Main nearest card */}
          {(() => {
            const zc = ZONE_CLR[nearest.zone] ?? C.s
            const { label: proxLabel, color: proxColor, pulse } = proximity(nearest.dist, nearest.radiusMeters)
            return (
              <div style={{
                padding: '16px', borderRadius: 16, marginBottom: 12,
                background: isDark
                  ? `linear-gradient(135deg,${zc}18,${zc}08)`
                  : `linear-gradient(135deg,${zc}12,${zc}06)`,
                border: `1.5px solid ${zc}40`,
                boxShadow: `0 4px 20px ${zc}20`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* pulse ring if you're AT the table */}
                {pulse && (
                  <>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 14,
                      border: `2px solid ${zc}`,
                      animation: 'near-pulse 1.8s ease-out infinite',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 14,
                      border: `2px solid ${zc}`,
                      animation: 'near-pulse 1.8s ease-out 0.6s infinite',
                      pointerEvents: 'none',
                    }} />
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                  {/* Big table badge */}
                  <div style={{
                    width: 58, height: 58, borderRadius: 18, flexShrink: 0,
                    background: `linear-gradient(135deg,${zc},${zc}cc)`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', boxShadow: `0 6px 20px ${zc}55`,
                  }}>
                    <span style={{ fontSize: 10, opacity: 0.8, fontFamily: 'DM Sans,sans-serif' }}>TABLE</span>
                    <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1, fontFamily: 'DM Sans,sans-serif' }}>
                      {nearest.tableNumber}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Proximity label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {pulse && <div style={{ width: 7, height: 7, borderRadius: '50%', background: proxColor, animation: 'gps-blink 1s ease-in-out infinite', flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, fontWeight: 800, color: proxColor, fontFamily: 'DM Sans,sans-serif' }}>
                        {proxLabel}
                      </span>
                    </div>

                    {/* Zone + seats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: zc + '20', color: zc,
                      }}>
                        {ZONE_EMOJI[nearest.zone]} {nearest.zone}
                      </span>
                      <span style={{ fontSize: 11, color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif' }}>
                        <Users size={9} style={{ display: 'inline', marginRight: 3 }} />{nearest.capacity} seats
                      </span>
                    </div>

                    {/* Distance meter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 20, fontWeight: 900, fontFamily: 'DM Mono,monospace',
                        color: isDark ? '#FFF8EE' : '#1A0E04', letterSpacing: '-1px',
                      }}>
                        {distLabel(nearest.dist)}
                      </span>
                      <span style={{ fontSize: 10, color: isDark ? '#6B4F35' : '#A07850', fontFamily: 'DM Sans,sans-serif' }}>
                        from you
                      </span>
                    </div>
                  </div>
                </div>

                {/* Radius indicator bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9,
                    color: isDark ? '#4A3520' : '#C0A080', fontFamily: 'DM Sans,sans-serif', marginBottom: 4 }}>
                    <span>0m</span>
                    <span>detection zone: {nearest.radiusMeters}m</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${Math.min(100, (nearest.dist / (nearest.radiusMeters * 3)) * 100)}%`,
                      background: `linear-gradient(90deg,${zc},${zc}88)`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <span style={{ fontSize: 9, color: zc, fontFamily: 'DM Sans,sans-serif', fontWeight: 700 }}>
                      {nearest.dist <= nearest.radiusMeters ? '✓ Inside zone' : `${(nearest.dist - nearest.radiusMeters).toFixed(1)}m outside zone`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Nearby list — top 4 other tables */}
          {ranked.length > 1 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                color: isDark ? '#4A3520' : '#C0A080', fontFamily: 'DM Sans,sans-serif', marginBottom: 8 }}>
                Other tables nearby
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {ranked.slice(1, 4).map((t, idx) => {
                  const zc = ZONE_CLR[t.zone] ?? '#888'
                  return (
                    <NearbyRow key={t._id} table={t} zc={zc} idx={idx} isDark={isDark} distLabel={distLabel} />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanning but no tables yet */}
      {active && !nearest && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Loader size={18} color={C.s} style={{ animation: 'tm-spin 1s linear infinite', display: 'inline-block' }} />
          <p style={{ fontSize: 12, marginTop: 8, color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif' }}>
            Waiting for GPS fix…
          </p>
        </div>
      )}
    </div>
  )
}

// Tiny animated nearby row
const NearbyRow = ({ table, zc, idx, isDark, distLabel }) => {
  const ref = useRef(null)
  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.3, delay: idx * 0.06, ease: 'power2.out' }
    )
  }, [table._id])

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 11,
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: zc + '22', color: zc,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, fontFamily: 'DM Sans,sans-serif',
      }}>
        {table.tableNumber}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#D4B896' : '#5A3820', fontFamily: 'DM Sans,sans-serif' }}>
          {ZONE_EMOJI[table.zone]} {table.zone}
        </span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace',
        color: isDark ? '#FFF8EE' : '#1A0E04' }}>
        {distLabel(table.dist)}
      </span>
    </div>
  )
}

// ─── GPS Capture ──────────────────────────────────────────────────────────────
const GpsCapture = ({ isDark, onCaptured }) => {
  const [phase,    setPhase]    = useState('idle')
  const [coords,   setCoords]   = useState(null)
  const [errMsg,   setErrMsg]   = useState('')
  const [attempts, setAttempts] = useState(0)
  const watchRef  = useRef(null)
  const bestRef   = useRef(null)
  const timerRef  = useRef(null)

  const stopWatch = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const startScan = () => {
    if (!navigator.geolocation) { setPhase('error'); setErrMsg('Geolocation not supported'); return }
    setPhase('scanning'); setCoords(null); bestRef.current = null; setAttempts(0)
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
        const fix = { lat, lng, accuracy }
        setAttempts(a => a + 1); setCoords(fix)
        if (!bestRef.current || accuracy < bestRef.current.accuracy) bestRef.current = fix
        if (accuracy <= ACC_GOOD) { stopWatch(); setPhase('locked'); setCoords(bestRef.current); onCaptured(bestRef.current) }
      },
      (err) => {
        stopWatch(); setPhase('error')
        setErrMsg(err.code === 1 ? 'Permission denied — allow location in browser settings'
          : err.code === 2 ? 'Position unavailable — try near a window'
          : 'GPS timeout — tap to retry')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
    timerRef.current = setTimeout(() => {
      stopWatch()
      if (bestRef.current) { setPhase('locked'); setCoords(bestRef.current); onCaptured(bestRef.current) }
      else { setPhase('error'); setErrMsg('No GPS fix — try again near a window') }
    }, 15000)
  }

  const reset = () => { stopWatch(); setPhase('idle'); setCoords(null); bestRef.current = null }
  useEffect(() => () => stopWatch(), [])

  if (phase === 'idle') return (
    <button onClick={startScan} className="btn-compact" style={{
      width: '100%', padding: '15px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
      background: `linear-gradient(135deg,${C.s} 0%,${C.t} 100%)`,
      color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      boxShadow: `0 6px 28px ${C.s}55`, transition: 'transform 0.15s,box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 36px ${C.s}66` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 28px ${C.s}55` }}
    >
      <Navigation size={17} />
      Use My Current Location
    </button>
  )

  if (phase === 'scanning') return (
    <div style={{
      padding: '20px', borderRadius: 14, textAlign: 'center',
      background: isDark ? 'rgba(255,159,28,0.07)' : 'rgba(255,159,28,0.06)',
      border: `1.5px solid ${C.s}33`,
    }}>
      <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 14px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `2px solid ${C.s}`,
            animation: `gps-ring 2s ease-out ${i * 0.55}s infinite`,
            opacity: 0,
          }} />
        ))}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 26, height: 26, borderRadius: '50%',
          background: `linear-gradient(135deg,${C.s},${C.t})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 4px ${C.s}22`,
        }}>
          <Navigation size={13} color="#fff" />
        </div>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px',
        color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'DM Sans,sans-serif' }}>
        Acquiring GPS signal…
      </p>
      <p style={{ fontSize: 12, margin: '0 0 10px',
        color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif' }}>
        Keep device flat · hold still for best accuracy
      </p>
      {coords && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 99, marginBottom: 14,
          background: accColor(coords.accuracy) + '18',
          border: `1px solid ${accColor(coords.accuracy)}33`,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: accColor(coords.accuracy), animation: 'gps-blink 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: accColor(coords.accuracy), fontFamily: 'DM Sans,sans-serif' }}>
            {accLabel(coords.accuracy)}
          </span>
          <span style={{ fontSize: 10, color: isDark ? '#6B4F35' : '#A07850' }}>· {attempts} fix{attempts !== 1 ? 'es' : ''}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {coords && coords.accuracy <= ACC_OK && (
          <button onClick={() => { stopWatch(); setPhase('locked'); setCoords(bestRef.current); onCaptured(bestRef.current) }}
            className="btn-compact" style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg,${C.m},#1E7A42)`,
              color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif',
            }}>
            Use This ({coords.accuracy.toFixed(1)}m)
          </button>
        )}
        <button onClick={reset} className="btn-compact" style={{
          padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          color: isDark ? '#9E7D5A' : '#7A5C3A', fontSize: 12, fontFamily: 'DM Sans,sans-serif',
        }}>
          Cancel
        </button>
      </div>
    </div>
  )

  if (phase === 'locked') return (
    <div style={{
      padding: '14px 16px', borderRadius: 14,
      background: isDark ? 'rgba(45,155,90,0.1)' : 'rgba(45,155,90,0.08)',
      border: `1.5px solid ${C.m}44`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
        background: `linear-gradient(135deg,${C.m},#1E7A42)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 14px ${C.m}44`,
      }}>
        <CheckCircle size={21} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: C.m, fontFamily: 'DM Sans,sans-serif' }}>
          Location Captured
        </p>
        <p style={{ fontSize: 11, margin: '0 0 2px', fontFamily: 'DM Mono,monospace',
          color: isDark ? '#9E7D5A' : '#7A5C3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fmtCoord(coords?.lat)}, {fmtCoord(coords?.lng)}
        </p>
        <p style={{ fontSize: 10, margin: 0, color: accColor(coords?.accuracy), fontFamily: 'DM Sans,sans-serif' }}>
          {accLabel(coords?.accuracy)}
        </p>
      </div>
      <button onClick={reset} className="btn-compact" style={{
        width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        color: isDark ? '#9E7D5A' : '#7A5C3A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={13} />
      </button>
    </div>
  )

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14,
      background: isDark ? 'rgba(224,92,42,0.1)' : '#FEF5F0',
      border: '1.5px solid rgba(224,92,42,0.3)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <AlertCircle size={17} color={C.t} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', color: C.t, fontFamily: 'DM Sans,sans-serif' }}>
          {errMsg}
        </p>
        <button onClick={startScan} className="btn-compact" style={{
          padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg,${C.s},${C.t})`,
          color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif',
        }}>
          Try Again
        </button>
      </div>
    </div>
  )
}

// ─── Add Table Form ───────────────────────────────────────────────────────────
const AddTableForm = ({ isDark, cafeId, onAdded, onClose }) => {
  const [coords, setCoords] = useState(null)
  const [form,   setForm]   = useState({ tableNumber: '', zone: 'Indoor', capacity: 4, radiusMeters: 1.5 })
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    gsap.fromTo(ref.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' })
  }, [])

  const handleSave = async () => {
    if (!form.tableNumber.trim()) { toast.error('Enter a table number'); return }
    if (!coords)                  { toast.error('Capture location first'); return }
    setSaving(true)
    try {
      const res = await api.post('/tables', {
        tableNumber: form.tableNumber.trim(), lat: coords.lat, lng: coords.lng,
        radiusMeters: form.radiusMeters, capacity: form.capacity, zone: form.zone, cafeId,
      })
      const t = res.data?.table ?? res.table
      toast.success(`Table ${t.tableNumber} added! 🎉`)
      onAdded(t)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create table')
    }
    setSaving(false)
  }

  const ready = coords && form.tableNumber.trim()

  return (
    <div ref={ref} style={{ ...glass(isDark), padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: `linear-gradient(135deg,${C.s}22,${C.s}3A)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={17} color={C.s} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0,
              fontFamily: 'Playfair Display,serif', color: isDark ? '#FFF8EE' : '#1A0E04' }}>
              Add New Table
            </p>
            <p style={{ fontSize: 11, margin: 0, color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif' }}>
              Walk to the table first, then capture
            </p>
          </div>
        </div>
        <button onClick={onClose} className="btn-compact" style={{
          width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          color: isDark ? '#9E7D5A' : '#7A5C3A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: coords ? `linear-gradient(135deg,${C.m},#1E7A42)` : `linear-gradient(135deg,${C.s},${C.t})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: 'DM Sans,sans-serif',
            boxShadow: coords ? `0 3px 10px ${C.m}44` : `0 3px 10px ${C.s}44`,
          }}>
            {coords ? '✓' : '1'}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'DM Sans,sans-serif' }}>
            Stand at the table · capture your location
          </span>
        </div>
        <GpsCapture isDark={isDark} onCaptured={setCoords} />
      </div>

      <div style={{
        height: 1, margin: '0 0 18px',
        background: `linear-gradient(90deg,transparent,${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'},transparent)`,
      }} />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDark ? '#9E7D5A' : '#7A5C3A', fontSize: 11, fontWeight: 800,
          }}>2</div>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'DM Sans,sans-serif' }}>
            Fill in table details
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={fieldLabel(isDark)}>Table Number *</label>
            <input
              placeholder="e.g. T-5, TR-1, BG-3"
              value={form.tableNumber}
              onChange={e => setForm(f => ({ ...f, tableNumber: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = C.s; e.target.style.boxShadow = `0 0 0 3px ${C.s}18` }}
              onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = 'none' }}
              style={inputBase(isDark)}
            />
          </div>

          <div>
            <label style={fieldLabel(isDark)}>Zone</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {ZONES.map(z => (
                <button key={z} onClick={() => setForm(f => ({ ...f, zone: z }))} className="btn-compact" style={{
                  flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                  background: form.zone === z ? `linear-gradient(135deg,${ZONE_CLR[z]},${ZONE_CLR[z]}cc)` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: form.zone === z ? '#fff' : isDark ? '#9E7D5A' : '#7A5C3A',
                  boxShadow: form.zone === z ? `0 3px 10px ${ZONE_CLR[z]}44` : 'none',
                }}>
                  {ZONE_EMOJI[z]}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, margin: '4px 0 0', color: ZONE_CLR[form.zone],
              fontWeight: 700, fontFamily: 'DM Sans,sans-serif', textAlign: 'center' }}>
              {form.zone}
            </p>
          </div>

          <div>
            <label style={fieldLabel(isDark)}>Seats</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setForm(f => ({ ...f, capacity: Math.max(1, f.capacity - 1) }))} className="btn-compact" style={{
                width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                color: isDark ? '#FFF8EE' : '#1A0E04', fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800,
                color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'DM Sans,sans-serif' }}>
                {form.capacity}
              </span>
              <button onClick={() => setForm(f => ({ ...f, capacity: Math.min(20, f.capacity + 1) }))} className="btn-compact" style={{
                width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                color: isDark ? '#FFF8EE' : '#1A0E04', fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={fieldLabel(isDark)}>
              GPS Detection Radius &nbsp;
              <span style={{ color: C.s, fontWeight: 800 }}>{form.radiusMeters}m</span>
            </label>
            <input type="range" min={0.5} max={8} step={0.5} value={form.radiusMeters}
              onChange={e => setForm(f => ({ ...f, radiusMeters: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: C.s, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9,
              color: isDark ? '#4A3520' : '#C0A080', fontFamily: 'DM Sans,sans-serif', marginTop: 3 }}>
              <span>0.5m tight</span><span>4m medium</span><span>8m large</span>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !ready} className="btn-compact" style={{
          width: '100%', padding: '14px', borderRadius: 14, border: 'none',
          cursor: ready && !saving ? 'pointer' : 'not-allowed',
          background: ready && !saving ? `linear-gradient(135deg,${C.s},${C.t})` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          color: ready && !saving ? '#fff' : isDark ? '#4A3520' : '#C0A080',
          fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans,sans-serif',
          boxShadow: ready && !saving ? `0 6px 24px ${C.s}44` : 'none',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving ? <><Loader size={15} style={{ animation: 'tm-spin 1s linear infinite' }} /> Saving…</>
           : !coords ? '① Capture location first'
           : !form.tableNumber.trim() ? '② Enter table number'
           : <><Check size={15} /> Add Table</>}
        </button>
      </div>
    </div>
  )
}

// ─── Edit inline ──────────────────────────────────────────────────────────────
const EditInline = ({ table, isDark, onSave, onClose }) => {
  const [form,   setForm]   = useState({ capacity: table.capacity, zone: table.zone, radiusMeters: table.radiusMeters })
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    gsap.fromTo(ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' })
  }, [])

  return (
    <div ref={ref} style={{
      padding: '14px', borderRadius: 14, margin: '4px 0',
      background: isDark ? 'rgba(255,159,28,0.06)' : 'rgba(255,159,28,0.05)',
      border: `1px solid ${C.s}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'DM Sans,sans-serif' }}>
          Edit · Table {table.tableNumber}
        </span>
        <button onClick={onClose} className="btn-compact" style={{
          width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer',
          background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          color: isDark ? '#9E7D5A' : '#7A5C3A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={11} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={fieldLabel(isDark)}>Zone</label>
          <select value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
            style={{ ...inputBase(isDark), padding: '8px 10px', fontSize: 12, appearance: 'none' }}>
            {ZONES.map(z => <option key={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label style={fieldLabel(isDark)}>Seats</label>
          <input type="number" min={1} max={20} value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
            style={{ ...inputBase(isDark), padding: '8px 10px', fontSize: 12 }} />
        </div>
        <div>
          <label style={fieldLabel(isDark)}>Radius m</label>
          <input type="number" min={0.5} step={0.5} value={form.radiusMeters}
            onChange={e => setForm(f => ({ ...f, radiusMeters: Number(e.target.value) }))}
            style={{ ...inputBase(isDark), padding: '8px 10px', fontSize: 12 }} />
        </div>
      </div>
      <button onClick={async () => { setSaving(true); await onSave(table._id, form); setSaving(false) }}
        disabled={saving} className="btn-compact" style={{
          width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg,${C.s},${C.t})`,
          color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif',
          opacity: saving ? 0.7 : 1,
        }}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ─── Table Card ───────────────────────────────────────────────────────────────
const TableCard = ({ table, index, isDark, onEdit, onDelete, onQr }) => {
  const ref = useRef(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const zc = ZONE_CLR[table.zone] ?? '#888'

  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, scale: 0.94, y: 12 },
      { opacity: 1, scale: 1, y: 0, duration: 0.38, delay: index * 0.04, ease: 'back.out(1.4)' }
    )
  }, [])

  return (
    <div ref={ref} style={{
      ...glass(isDark), padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'transform 0.18s, box-shadow 0.18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isDark ? '0 12px 48px rgba(0,0,0,0.5)' : '0 12px 48px rgba(60,30,10,0.13)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 50, height: 50, borderRadius: 15,
          background: `linear-gradient(135deg,${zc},${zc}dd)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 13,
          fontFamily: 'DM Sans,sans-serif', letterSpacing: '-0.5px',
          boxShadow: `0 4px 14px ${zc}55`, flexShrink: 0,
        }}>
          {table.tableNumber}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onQr(table)} className="btn-compact" title="Regenerate QR" style={{
            width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#9E7D5A' : '#7A5C3A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><QrCode size={12} /></button>
          <button onClick={() => onEdit(table)} className="btn-compact" title="Edit" style={{
            width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: C.s + '18', color: C.s,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Edit3 size={12} /></button>
          {confirmDel ? (
            <>
              <button onClick={() => onDelete(table._id)} className="btn-compact" style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#E0555522', color: '#E05555',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Check size={12} /></button>
              <button onClick={() => setConfirmDel(false)} className="btn-compact" style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                color: isDark ? '#9E7D5A' : '#7A5C3A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={12} /></button>
            </>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="btn-compact" title="Remove" style={{
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#9E7D5A' : '#7A5C3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Trash2 size={12} /></button>
          )}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800,
            color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'DM Sans,sans-serif' }}>
            Table {table.tableNumber}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: zc + '20', color: zc,
          }}>
            {ZONE_EMOJI[table.zone]} {table.zone}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 11, color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={10} />{table.capacity} seats
          </span>
          <span style={{ fontSize: 11, color: isDark ? '#7A5C3A' : '#9A7550', fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Maximize2 size={10} />{table.radiusMeters}m
          </span>
        </div>
      </div>
      <div style={{
        padding: '5px 10px', borderRadius: 8,
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <MapPin size={9} color={isDark ? '#4A3520' : '#C0A080'} />
        <span style={{ fontSize: 9, fontFamily: 'DM Mono,monospace',
          color: isDark ? '#4A3520' : '#C0A080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fmtCoord(table.lat)}, {fmtCoord(table.lng)}
        </span>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
const TableManagementPanel = () => {
  const { isDark } = useContext(ThemeContext)
  const user   = useSelector(s => s.auth?.user)
  const cafeId = user?.cafeId

  const [tables,    setTables]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [editTable, setEditTable] = useState(null)
  const headerRef = useRef(null)

  const fetchTables = useCallback(async () => {
    if (!cafeId) return
    setLoading(true)
    try {
      const res = await api.get(`/tables?cafeId=${cafeId}`)
      setTables(res.data?.tables ?? res.tables ?? [])
    } catch { toast.error('Failed to load tables') }
    finally { setLoading(false) }
  }, [cafeId])

  useEffect(() => {
    fetchTables()
    gsap.fromTo(headerRef.current, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
  }, [fetchTables])

  const handleAdded   = (t)          => { setTables(p => [...p, t]); setShowAdd(false) }
  const handleUpdate  = async (id, u) => {
    try {
      const res = await api.patch(`/tables/${id}`, u)
      setTables(p => p.map(t => t._id === id ? (res.data?.table ?? res.table) : t))
      setEditTable(null); toast.success('Table updated')
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed to update') }
  }
  const handleDelete  = async (id)   => {
    try { await api.delete(`/tables/${id}`); setTables(p => p.filter(t => t._id !== id)); toast.success('Table removed') }
    catch (err) { toast.error(err?.response?.data?.message ?? 'Failed to delete') }
  }
  const handleQr      = async (table) => {
    try { await api.post(`/tables/${table._id}/regenerate-qr`); toast.success(`QR regenerated · Table ${table.tableNumber}`) }
    catch { toast.error('Failed to regenerate QR') }
  }

  const byZone = ZONES.reduce((acc, z) => { acc[z] = tables.filter(t => t.zone === z).length; return acc }, {})

  return (
    <div style={{ fontFamily: 'DM Sans,sans-serif' }}>

      {/* Header */}
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.3px',
            fontFamily: 'DM Sans,serif', color: isDark ? '#FFF8EE' : '#1A0E04' }}>
            Table Management
          </h2>
          <p style={{ fontSize: 12, margin: '3px 0 0', color: isDark ? '#7A5C3A' : '#9A7550' }}>
            {tables.length} tables · walk to table to add
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchTables} className="btn-compact" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: isDark ? 'rgba(255,159,28,0.1)' : 'rgba(255,159,28,0.08)',
            color: C.s, fontSize: 12, fontWeight: 600,
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
          {!showAdd && (
            <button onClick={() => { setShowAdd(true); setEditTable(null) }} className="btn-compact" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg,${C.s},${C.t})`,
              color: '#fff', fontSize: 12, fontWeight: 700,
              boxShadow: `0 4px 16px ${C.s}44`,
            }}>
              <Plus size={14} /> Add Table
            </button>
          )}
        </div>
      </div>

      {/* ── NEAREST TABLE RADAR ── always visible when tables exist */}
      <NearestTableRadar tables={tables} isDark={isDark} />

      {/* Zone summary */}
      {tables.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {ZONES.map(z => (
            <div key={z} style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: ZONE_CLR[z] + '18', color: ZONE_CLR[z],
              fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {ZONE_EMOJI[z]} {z}
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: ZONE_CLR[z],
                color: '#fff', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {byZone[z]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <AddTableForm isDark={isDark} cafeId={cafeId} onAdded={handleAdded} onClose={() => setShowAdd(false)} />
      )}

      {/* Grid of table cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              height: 140, borderRadius: 20,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              animation: 'tm-pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div style={{ ...glass(isDark), padding: '52px 20px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: isDark ? 'rgba(255,159,28,0.08)' : 'rgba(255,159,28,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={28} color={C.s} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px',
            color: isDark ? '#FFF8EE' : '#1A0E04', fontFamily: 'Playfair Display,serif' }}>
            No tables yet
          </p>
          <p style={{ fontSize: 12, margin: '0 0 20px', color: isDark ? '#6B4F35' : '#A07850' }}>
            Walk to your first table and tap Add Table
          </p>
          <button onClick={() => setShowAdd(true)} style={{
            padding: '11px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${C.s},${C.t})`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            boxShadow: `0 5px 20px ${C.s}44`,
          }}>
            <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
            Add First Table
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {tables.map((t, i) => (
            <div key={t._id}>
              {editTable?._id === t._id
                ? <EditInline table={t} isDark={isDark} onSave={handleUpdate} onClose={() => setEditTable(null)} />
                : <TableCard table={t} index={i} isDark={isDark} onEdit={setEditTable} onDelete={handleDelete} onQr={handleQr} />
              }
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes gps-ring    { 0%{transform:scale(0.5);opacity:0.9} 100%{transform:scale(3);opacity:0} }
        @keyframes gps-blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes tm-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes tm-pulse    { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes near-pulse  { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.05);opacity:0} }
        @keyframes radar-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

export default TableManagementPanel