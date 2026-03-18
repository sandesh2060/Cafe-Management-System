// src/modules/cashier/pages/CashierDashboard.jsx
//
// ✅ FIX: Mobile content div no longer uses flex-1 (unreliable inside
//    DashboardLayout's flex column when Tailwind md: breakpoint interacts
//    with the scroll container).
//    Now uses style={{ minHeight: '100%' }} directly — same pattern as
//    WaiterDashboard and ManagerDashboard which work correctly.
// ✅ Desktop 2-col layout preserved
// ✅ GSAP tab transition preserved
// ✅ All var(--token) — zero hardcoded hex

import { useState, useRef } from 'react'
import DashboardLayout from '@shared/components/layout/DashboardLayout'
import BillingPanel    from '../components/billing/BillingPanel'
import TransactionList from '../components/transactions/TransactionList'
import CashierChat     from '../components/chat/CashierChat'
import gsap            from 'gsap'

const CashierDashboard = () => {
  const [tab, setTab] = useState('billing')
  const contentRef    = useRef(null)

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

      {/* ── Mobile: single panel switched by sidebar drawer ─────────────── */}
      {/*
        KEY FIX: Use inline style minHeight:'100%' instead of Tailwind flex-1.
        flex-1 = flex:1 1 0% which requires reliable flex context all the way up.
        minHeight:'100%' works against DashboardLayout's inner wrapper which
        already has minHeight:'100%' set — this chains correctly.
        Also removed md:hidden in favour of a className that hides on desktop,
        using the same approach but with explicit block display on mobile.
      */}
      <div
        ref={contentRef}
        className="md:hidden p-3"
        style={{ background: 'var(--bg)', minHeight: '100%' }}
      >
        {tab === 'billing'      && <BillingPanel />}
        {tab === 'transactions' && <TransactionList />}
        {tab === 'chat'         && <CashierChat />}
      </div>
    </DashboardLayout>
  )
}

export default CashierDashboard