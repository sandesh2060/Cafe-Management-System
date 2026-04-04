// frontend/src/modules/customer/hooks/usePricingRules.js
//
// Module 22 — Active pricing rules hook
//
// Fetches GET /pricing-rules/active?cafeId=xxx once on mount.
// Listens to socket events pricing:rule_activated + pricing:rule_expired
// to keep the list live without polling.
//
// Returns:
//   activeRules      — full list of currently active rules
//   getBadge(itemId, category) — returns { label, color } or null
//   loading          — initial load state

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@api/axios'
import { getSocket } from '@shared/services/socket.service'

// ── Badge color by discount type ──────────────────────────────────────────────
const badgeColor = (rule) => {
  if (rule.type === 'happy_hour')   return '#F97316'  // orange
  if (rule.type === 'loyalty_tier') return '#6366F1'  // indigo
  if (rule.type === 'combo')        return '#14B8A6'  // teal
  if (rule.type === 'surcharge')    return '#F43F5E'  // rose (surcharge = price up)
  return '#22C55E'                                    // green for all others
}

const badgeLabel = (rule) => {
  if (rule.discountType === 'percentage')   return `${rule.discountValue}% OFF`
  if (rule.discountType === 'fixed_amount') return `Rs ${rule.discountValue} OFF`
  if (rule.discountType === 'fixed_price')  return `Rs ${rule.discountValue}`
  if (rule.discountType === 'free')         return 'FREE'
  if (rule.type === 'surcharge')            return `+${rule.discountValue}%`
  return 'OFFER'
}

export const usePricingRules = (cafeId) => {
  const [activeRules, setActiveRules] = useState([])
  const [loading,     setLoading]     = useState(true)
  const loadedRef = useRef(false)

  const load = useCallback(async () => {
    if (!cafeId) { setLoading(false); return }
    try {
      const r = await api.get(`/pricing-rules/active?cafeId=${cafeId}`)
      setActiveRules(r.rules ?? r.data?.rules ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [cafeId])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    load()
  }, [load])

  // Live socket updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onActivated = () => load()
    const onExpired   = ({ ruleId }) => {
      setActiveRules(prev => prev.filter(r => r._id?.toString() !== ruleId?.toString()))
    }

    socket.on('pricing:rule_activated', onActivated)
    socket.on('pricing:rule_expired',   onExpired)
    return () => {
      socket.off('pricing:rule_activated', onActivated)
      socket.off('pricing:rule_expired',   onExpired)
    }
  }, [load])

  // ── Badge lookup for a single menu item ───────────────────────────────────
  const getBadge = useCallback((itemId, category) => {
    for (const rule of activeRules) {
      // Skip surcharges from badge display (they add cost, not discount)
      if (rule.type === 'surcharge') continue

      let applies = false
      if (rule.scope === 'all') {
        applies = true
      } else if (rule.scope === 'item') {
        applies = rule.targetItemIds?.some(id => id?.toString() === itemId?.toString())
      } else if (rule.scope === 'category') {
        applies = rule.targetCategories?.includes(category)
      }

      if (applies) {
        return {
          label: badgeLabel(rule),
          color: badgeColor(rule),
          rule,
        }
      }
    }
    return null
  }, [activeRules])

  return { activeRules, getBadge, loading }
}