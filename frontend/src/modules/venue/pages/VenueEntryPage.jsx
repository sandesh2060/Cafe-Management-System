// frontend/src/modules/venue/pages/VenueEntryPage.jsx
// ─── RESPONSIVE VENUE ENTRY ORCHESTRATOR ──────────────────────────────────────
//
// ─── FIX ──────────────────────────────────────────────────────────────────────
// BUG: `isDone` effect was navigating to '/login' unconditionally.
//      When remote access is confirmed, the user should go to '/menu' not '/login'.
//      '/login' is wrapped in GuestRoute which redirects logged-in users —
//      if a stale owner cookie set role:'owner', this caused a redirect chain:
//      /login → GuestRoute → getRoleHome('owner') → /owner → 401 → /owner/login
//
// FIX: split the isDone navigation into two cases:
//   - venueMode === 'remote' → navigate to '/login' (customer needs to log in)
//     BUT only if not already logged in as customer
//   - venueMode === 'at_venue' with tableId → navigate to '/menu'
//   The correct pattern: navigate('/login') only when customer is NOT logged in.
//   When they ARE logged in (any role that isn't owner/staff), go to '/menu'.
//
// Also: if isLoggedIn is true but role is 'owner' or a staff role, those users
// shouldn't be going through VenueEntryPage at all — DetectRoute in AppRoutes
// already handles this. So we only need to handle customer + guest + null here.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn, selectBootstrapReady, selectRole } from '@store/slices/authSlice'
import { selectTableId } from '@store/slices/tableSessionSlice'
import { selectHasVenue, selectVenueMode } from '@store/slices/venueSlice'
import { useVenueEntry, VENUE_STATES } from '../hooks/useVenueEntry'
import { FONTS } from '@shared/config/brand'

const TableDetectionPage = lazy(() => import('@modules/customer/pages/TableDetectionPage'))
const CafeAccessPage = lazy(() => import('../pages/CafeAccessPage'))

const S = VENUE_STATES

const FullSpin = ({ message }) => (
  <div className="min-h-dvh flex flex-col items-center justify-center px-6"
    style={{ background: 'radial-gradient(ellipse at 50% 40%,#0a1f1a 0%,#060e0c 50%,#030807 100%)' }}>
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[2.5px] border-white/[0.08] border-t-emerald-400 mb-4"
      style={{ animation: 'vspin 0.82s linear infinite' }} />
    {message && (
      <p className="text-[12px] sm:text-[13px] font-semibold text-white/30 text-center max-w-[240px] leading-relaxed"
        style={{ fontFamily: FONTS.body }}>
        {message}
      </p>
    )}
    <style>{`@keyframes vspin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

// Roles that should never be going through the venue flow
const STAFF_ROLES = ['owner', 'manager', 'admin', 'waiter', 'kitchen', 'cashier', 'rider']

const VenueEntryPage = () => {
  const navigate = useNavigate()
  const bootstrapReady = useSelector(selectBootstrapReady)
  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const role           = useSelector(selectRole)
  const tableId        = useSelector(selectTableId)
  const hasVenue       = useSelector(selectHasVenue)
  const venueMode      = useSelector(selectVenueMode)

  const {
    state, start, requestGps,
    insideCafe, directLinkCafe, directLinkTable,
    selectCafe, confirmRemote, goBackToAccess, retry,
    isLoading, isInsideVenue, isOutsideVenue,
    isLinkResolved, isCafeSelected, isDone,
  } = useVenueEntry()

  const started = useRef(false)

  useEffect(() => {
    if (!bootstrapReady) return
    if (started.current) return

    // ★ FIX: if user is a staff/owner role, redirect them to their home immediately
    // Don't let them go through the venue flow — it would cause redirect loops
    if (isLoggedIn && role && STAFF_ROLES.includes(role)) {
      const roleHomes = {
        owner:   '/owner',
        manager: '/manager',
        admin:   '/admin',
        waiter:  '/waiter',
        kitchen: '/kitchen',
        cashier: '/cashier',
        rider:   '/rider',
      }
      navigate(roleHomes[role] ?? '/login', { replace: true })
      return
    }

    if (hasVenue && isLoggedIn && tableId) { navigate('/menu', { replace: true }); return }
    if (hasVenue && venueMode && !isLoggedIn) { navigate('/login', { replace: true }); return }
    started.current = true
    start()
  }, [bootstrapReady, hasVenue, isLoggedIn, role, tableId, venueMode, navigate, start])

  useEffect(() => {
    if (state !== S.LINK_RESOLVED) return
    navigate(directLinkTable ? '/detect' : '/login', { replace: true })
  }, [state, directLinkTable, navigate])

  useEffect(() => { if (state === S.REQUESTING_GPS) requestGps() }, [state, requestGps])

  // ★ FIX: was navigate('/login') unconditionally — this caused the bug.
  // When remote access is confirmed:
  //   - If already logged in as customer → go straight to /menu
  //   - If not logged in → go to /login (customer needs to authenticate)
  useEffect(() => {
    if (!isDone) return
    if (isLoggedIn && role === 'customer') {
      navigate('/menu', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [isDone, isLoggedIn, role, navigate])

  if (!bootstrapReady) return <FullSpin />

  if (isLoading) {
    const msgs = {
      [S.CHECKING_LINK]:    'Checking link…',
      [S.REQUESTING_GPS]:   'Detecting location…',
      [S.CHECKING_GEOFENCE]:'Checking venue…',
    }
    return <FullSpin message={msgs[state]} />
  }

  if (isInsideVenue) return (
    <Suspense fallback={<FullSpin message="Loading…" />}>
      <TableDetectionPage />
    </Suspense>
  )

  if (isOutsideVenue || isCafeSelected) return (
    <Suspense fallback={<FullSpin />}>
      <CafeAccessPage
        onSelectCafe={selectCafe}
        onConfirmRemote={confirmRemote}
        onGoBack={goBackToAccess}
        isCafeSelected={isCafeSelected}
      />
    </Suspense>
  )

  return <FullSpin message="Setting up…" />
}

export default VenueEntryPage