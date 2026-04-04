// src/modules/cashier/pages/CashierDashboard.jsx
//
// UPGRADE: billing nav tab now shows a live badge when payment requests come in.
// BillingPanel fires a custom window event 'billing:queue-count' with { count }.
// This component listens and stores the count in state → passes to DashboardLayout
// via a navBadges prop (or renders its own badge overlay if DashboardLayout
// doesn't support badges yet — handled with a wrapper approach below).

import { useState, useRef, useEffect } from 'react'
import DashboardLayout from '@shared/components/layout/DashboardLayout'
import BillingPanel    from '../components/billing/BillingPanel'
import TransactionList from '../components/transactions/TransactionList'
import CashierChat     from '../components/chat/CashierChat'
import gsap            from 'gsap'

const CashierDashboard = () => {
  const [tab, setTab]               = useState('billing')
  const [billingBadge, setBillingBadge] = useState(0)
  const contentRef = useRef(null)

  // Listen for payment request count from BillingPanel
  useEffect(() => {
    const handler = (e) => setBillingBadge(e.detail?.count ?? 0)
    window.addEventListener('billing:queue-count', handler)
    return () => window.removeEventListener('billing:queue-count', handler)
  }, [])

  // Clear badge when user switches to billing tab
  useEffect(() => {
    if (tab === 'billing') setBillingBadge(0)
  }, [tab])

  const switchTab = (key) => {
    if (key === tab) return
    if (contentRef.current)
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
      )
    setTab(key)
  }

  return (
    <DashboardLayout
      title="Cashier"
      role="cashier"
      activeNav={tab}
      onNavChange={switchTab}
    >
      {/* ── Desktop: 2-col side-by-side ─────────────────────────────────── */}
      <div
        className="hidden md:grid md:grid-cols-2 gap-4 p-4"
        style={{ background: 'var(--bg)', minHeight: '100%' }}
      >
        <div className="overflow-auto">
          <BillingPanel />
        </div>
        <div className="overflow-auto space-y-4">
          <TransactionList />
          <CashierChat />
        </div>
      </div>

      {/* ── Mobile: single panel, tab-switched ──────────────────────────── */}
      <div
        ref={contentRef}
        className="md:hidden p-3"
        style={{ background: 'var(--bg)', minHeight: '100%', position: 'relative' }}
      >
        {/* Billing badge indicator — visible when not on billing tab */}
        {billingBadge > 0 && tab !== 'billing' && (
          <button
            onClick={() => switchTab('billing')}
            style={{
              position: 'fixed', bottom: 80, right: 16, zIndex: 50,
              background: '#F59E0B',
              color: '#fff',
              border: 'none',
              borderRadius: 99,
              padding: '8px 16px',
              fontSize: 12, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 20px rgba(245,158,11,0.45)',
              cursor: 'pointer',
              animation: 'cd-pulse 2s ease-in-out infinite',
            }}
          >
            🔔 {billingBadge} payment request{billingBadge !== 1 ? 's' : ''}
          </button>
        )}

        {tab === 'billing'      && <BillingPanel />}
        {tab === 'transactions' && <TransactionList />}
        {tab === 'chat'         && <CashierChat />}
      </div>

      <style>{`
        @keyframes cd-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(245,158,11,0.45); }
          50%       { transform: scale(1.04); box-shadow: 0 6px 28px rgba(245,158,11,0.65); }
        }
      `}</style>
    </DashboardLayout>
  )
}

export default CashierDashboard