// src/modules/manager/pages/ManagerDashboard.jsx
import { useState }          from 'react'
import DashboardLayout       from '@shared/components/layout/DashboardLayout'
import SalesOverview         from '../components/analytics/SalesOverview'
import ActiveSessionsPanel   from '../components/tables/ActiveSessionsPanel'
import StaffList             from '../components/staff/StaffList'
import InventoryPanel        from '../components/inventory/InventoryPanel'
import LoyaltyPanel          from '../components/loyalty/LoyaltyPanel'
import ReportsPanel          from '../components/reports/ReportsPanel'
import ManagerMessageHub     from '../components/messaging/ManagerMessageHub'
import { useManagerSocket }  from '../hooks/useManagerSocket'
import { COLORS }            from '@colors'
import {
  BarChart2, Users, Map, Package, Star, FileText, MessageSquare
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'overview',   label: 'Overview',   Icon: BarChart2     },
  { key: 'staff',      label: 'Staff',      Icon: Users         },
  { key: 'tables',     label: 'Tables',     Icon: Map           },
  { key: 'inventory',  label: 'Inventory',  Icon: Package       },
  { key: 'loyalty',    label: 'Loyalty',    Icon: Star          },
  { key: 'reports',    label: 'Reports',    Icon: FileText      },
  { key: 'messages',   label: 'Messages',   Icon: MessageSquare },
]

const ManagerDashboard = () => {
  const [section, setSection] = useState('overview')
  useManagerSocket()

  const renderSection = () => {
    switch (section) {
      case 'overview':  return <SalesOverview />
      case 'staff':     return <StaffList />
      case 'tables':    return <ActiveSessionsPanel />
      case 'inventory': return <InventoryPanel />
      case 'loyalty':   return <LoyaltyPanel />
      case 'reports':   return <ReportsPanel />
      case 'messages':  return <ManagerMessageHub />
      default:          return <SalesOverview />
    }
  }

  return (
    <DashboardLayout
      title="Manager"
      role="manager"
      navItems={NAV_ITEMS}
      activeNav={section}
      onNavChange={setSection}
    >
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {renderSection()}
      </div>
    </DashboardLayout>
  )
}

export default ManagerDashboard