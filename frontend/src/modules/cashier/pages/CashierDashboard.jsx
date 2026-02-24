// src/modules/cashier/pages/CashierDashboard.jsx
import { useState }        from 'react'
import DashboardLayout     from '@shared/components/layout/DashboardLayout'
import BillingPanel        from '../components/billing/BillingPanel'
import TransactionList     from '../components/transactions/TransactionList'
import CashierChat         from '../components/chat/CashierChat'
import { COLORS }          from '@colors'
import { CreditCard, List, MessageSquare } from 'lucide-react'

const TABS = [
  { key: 'billing',       label: 'Billing',       Icon: CreditCard   },
  { key: 'transactions',  label: 'Transactions',  Icon: List         },
  { key: 'chat',          label: 'Chat',          Icon: MessageSquare},
]

const CashierDashboard = () => {
  const [tab, setTab] = useState('billing')

  return (
    <DashboardLayout title="Cashier" role="cashier">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-20">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors relative"
            style={{ color: tab === key ? COLORS.saffron.DEFAULT : COLORS.brew.soft }}
          >
            <Icon size={16} />
            {label}
            {tab === key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />}
          </button>
        ))}
      </div>

      {/* Desktop: split layout */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 p-4 h-full overflow-hidden">
        <div className="overflow-auto">
          <BillingPanel />
        </div>
        <div className="overflow-auto space-y-4">
          <TransactionList />
          <CashierChat />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex-1 overflow-auto p-3">
        {tab === 'billing'      && <BillingPanel />}
        {tab === 'transactions' && <TransactionList />}
        {tab === 'chat'         && <CashierChat />}
      </div>
    </DashboardLayout>
  )
}

export default CashierDashboard