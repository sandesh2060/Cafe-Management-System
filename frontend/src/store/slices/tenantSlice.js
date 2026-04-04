// frontend/src/store/slices/tenantSlice.js
//
// ─── PURPOSE ──────────────────────────────────────────────────────────────────
// Holds the current cafe's tenant config — theme preset, brandConfig,
// feature flags, plan, subscription status.
//
// Loaded once on app boot (ThemeContext fetches /api/tenants/theme).
// Updated via socket event theme:updated (manager saves new theme).
// Feature flags read by ProtectedRoute + feature-gated components.
//
// NEVER holds billing history or owner account — those live in ownerSlice
// and subscriptionSlice respectively.
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

// ── Async thunks ──────────────────────────────────────────────────────────────

// Fetch public theme — called on boot by ThemeContext
// No auth required — theme is public so menu page loads correctly
// even before login
export const fetchTenantTheme = createAsyncThunk(
  'tenant/fetchTheme',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(ENDPOINTS.TENANT?.THEME ?? '/tenants/theme')
      return res?.data ?? res
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load theme')
    }
  }
)

// Fetch full tenant config — called after manager/owner login
// Includes feature flags, usage, plan details
export const fetchTenantConfig = createAsyncThunk(
  'tenant/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(ENDPOINTS.TENANT?.ME ?? '/tenants/me')
      return res?.data ?? res
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load tenant config')
    }
  }
)

// Save theme — manager only
export const saveTenantTheme = createAsyncThunk(
  'tenant/saveTheme',
  async (themePayload, { rejectWithValue }) => {
    try {
      const res = await api.patch(ENDPOINTS.TENANT?.THEME ?? '/tenants/theme', themePayload)
      return res?.data ?? res
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save theme')
    }
  }
)

// Toggle a feature flag — owner only
export const updateTenantFeatures = createAsyncThunk(
  'tenant/updateFeatures',
  async (features, { rejectWithValue }) => {
    try {
      const res = await api.patch(
        ENDPOINTS.TENANT?.FEATURES ?? '/tenants/features',
        { features }
      )
      return res?.data ?? res
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update features')
    }
  }
)

// ── Default brand config ───────────────────────────────────────────────────────
const DEFAULT_BRAND = {
  presetId:       'default',
  logoUrl:        null,
  overrides:      { accent: null, bgBase: null },
  welcomeMessage: null,
  bannerUrls:     [],
}

// ── Default features (most restrictive — trial/basic defaults) ─────────────────
const DEFAULT_FEATURES = {
  gpsTableDetection: true,
  delivery:          false,
  gallery:           false,
  loyalty:           false,
  chat:              false,
  analytics:         false,
  theme:             false,
  api:               false,
  maxOrders:         500,
  maxStaff:          3,
  maxBranches:       1,
}

// ── Initial state ──────────────────────────────────────────────────────────────
const initialState = {
  // Cafe identity
  cafeId:    null,
  cafeName:  null,
  slug:      null,

  // Plan & status
  plan:   null,   // 'trial' | 'basic_starter' | 'basic_growth' | 'basic_scale' | 'pro'
  status: null,   // 'trial' | 'active' | 'grace' | 'readonly' | 'suspended'

  // Subscription expiry
  trialEndsAt:        null,
  gracePeriodEndsAt:  null,
  subscriptionEndsAt: null,

  // Theme / branding
  brandConfig: DEFAULT_BRAND,

  // Feature flags — used by requireFeature gates throughout the app
  features: DEFAULT_FEATURES,

  // Usage this month (shown in manager SubscriptionPanel)
  usageThisMonth: {
    orderCount: 0,
    staffCount: 0,
    month:      null,
  },

  // Cap warning state — populated by socket orders:cap_warning event
  capWarning: {
    active:      false,
    used:        0,
    limit:       0,
    pct:         0,
    inGrace:     false,
    hardBlocked: false,
  },

  // Loading/error
  loading:      false,
  themeLoading: false,
  error:        null,
  themeReady:   false,   // true once first theme fetch completes (prevents FOUC)
}

// ── Slice ──────────────────────────────────────────────────────────────────────
const tenantSlice = createSlice({
  name: 'tenant',
  initialState,

  reducers: {
    // Called by ThemeContext socket listener on theme:updated event
    applyThemeUpdate: (state, { payload }) => {
      if (payload?.brandConfig) {
        state.brandConfig = { ...state.brandConfig, ...payload.brandConfig }
      }
      if (payload?.presetId) {
        state.brandConfig.presetId = payload.presetId
      }
    },

    // Called by socket on orders:cap_warning
    setCapWarning: (state, { payload }) => {
      state.capWarning = {
        active:      true,
        used:        payload.used   ?? 0,
        limit:       payload.limit  ?? 0,
        pct:         payload.pct    ?? 0,
        inGrace:     payload.inGrace    ?? false,
        hardBlocked: payload.hardBlocked ?? false,
      }
    },

    // Called when orders:hard_blocked socket fires
    setHardBlocked: (state) => {
      state.capWarning.active      = true
      state.capWarning.hardBlocked = true
    },

    // Called by socket on subscription:readonly
    setReadOnly: (state) => {
      state.status = 'readonly'
    },

    // Called by socket on subscription:activated (manager/owner receives this)
    applySubscriptionActivated: (state, { payload }) => {
      state.plan               = payload.plan      ?? state.plan
      state.status             = 'active'
      state.subscriptionEndsAt = payload.expiresAt ?? state.subscriptionEndsAt
      // Reset cap warning on upgrade
      state.capWarning = initialState.capWarning
    },

    // Increment local order count optimistically (OrderSlice calls this)
    incrementOrderCount: (state) => {
      state.usageThisMonth.orderCount += 1
    },

    clearTenantError: (state) => {
      state.error = null
    },

    resetTenant: () => initialState,
  },

  extraReducers: (builder) => {
    // ── fetchTenantTheme ────────────────────────────────────────────────────
    builder
      .addCase(fetchTenantTheme.pending, (state) => {
        state.themeLoading = true
        state.error        = null
      })
      .addCase(fetchTenantTheme.fulfilled, (state, { payload }) => {
        state.themeLoading = false
        state.themeReady   = true

        // Server returns brandConfig directly on theme endpoint
        const brand = payload?.brandConfig ?? payload
        if (brand) {
          state.brandConfig = {
            presetId:       brand.presetId       ?? DEFAULT_BRAND.presetId,
            logoUrl:        brand.logoUrl        ?? null,
            overrides:      brand.overrides      ?? DEFAULT_BRAND.overrides,
            welcomeMessage: brand.welcomeMessage ?? null,
            bannerUrls:     brand.bannerUrls     ?? [],
          }
        }

        // Theme endpoint also returns cafe identity
        if (payload?.cafeName) state.cafeName = payload.cafeName
        if (payload?.cafeId)   state.cafeId   = payload.cafeId
        if (payload?.slug)     state.slug      = payload.slug
      })
      .addCase(fetchTenantTheme.rejected, (state, { payload }) => {
        state.themeLoading = false
        state.themeReady   = true   // don't block app on theme fetch failure
        state.error        = payload ?? 'Theme fetch failed'
      })

    // ── fetchTenantConfig ───────────────────────────────────────────────────
    builder
      .addCase(fetchTenantConfig.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(fetchTenantConfig.fulfilled, (state, { payload }) => {
        state.loading = false

        const t = payload ?? {}
        state.cafeId   = t.cafeId   ?? state.cafeId
        state.cafeName = t.name     ?? state.cafeName
        state.slug     = t.slug     ?? state.slug
        state.plan     = t.plan     ?? state.plan
        state.status   = t.status   ?? state.status

        state.trialEndsAt        = t.trialEndsAt        ?? null
        state.gracePeriodEndsAt  = t.gracePeriodEndsAt  ?? null
        state.subscriptionEndsAt = t.subscriptionEndsAt ?? null

        if (t.features)    state.features    = { ...DEFAULT_FEATURES, ...t.features }
        if (t.brandConfig) state.brandConfig = { ...DEFAULT_BRAND,    ...t.brandConfig }

        if (t.usageThisMonth) {
          state.usageThisMonth = {
            orderCount: t.usageThisMonth.orderCount ?? 0,
            staffCount: t.usageThisMonth.staffCount ?? 0,
            month:      t.usageThisMonth.month      ?? null,
          }
        }
      })
      .addCase(fetchTenantConfig.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? 'Config fetch failed'
      })

    // ── saveTenantTheme ─────────────────────────────────────────────────────
    builder
      .addCase(saveTenantTheme.pending, (state) => {
        state.themeLoading = true
        state.error        = null
      })
      .addCase(saveTenantTheme.fulfilled, (state, { payload }) => {
        state.themeLoading = false
        if (payload?.brandConfig) {
          state.brandConfig = { ...DEFAULT_BRAND, ...payload.brandConfig }
        }
      })
      .addCase(saveTenantTheme.rejected, (state, { payload }) => {
        state.themeLoading = false
        state.error        = payload ?? 'Theme save failed'
      })

    // ── updateTenantFeatures ────────────────────────────────────────────────
    builder
      .addCase(updateTenantFeatures.fulfilled, (state, { payload }) => {
        if (payload?.features) {
          state.features = { ...DEFAULT_FEATURES, ...payload.features }
        }
      })
      .addCase(updateTenantFeatures.rejected, (state, { payload }) => {
        state.error = payload ?? 'Feature update failed'
      })
  },
})

export const {
  applyThemeUpdate,
  setCapWarning,
  setHardBlocked,
  setReadOnly,
  applySubscriptionActivated,
  incrementOrderCount,
  clearTenantError,
  resetTenant,
} = tenantSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectTenant              = (s) => s.tenant
export const selectTenantPlan          = (s) => s.tenant.plan
export const selectTenantStatus        = (s) => s.tenant.status
export const selectBrandConfig         = (s) => s.tenant.brandConfig
export const selectPresetId            = (s) => s.tenant.brandConfig.presetId
export const selectLogoUrl             = (s) => s.tenant.brandConfig.logoUrl
export const selectWelcomeMessage      = (s) => s.tenant.brandConfig.welcomeMessage
export const selectBannerUrls          = (s) => s.tenant.brandConfig.bannerUrls
export const selectFeatures            = (s) => s.tenant.features
export const selectUsageThisMonth      = (s) => s.tenant.usageThisMonth
export const selectCapWarning          = (s) => s.tenant.capWarning
export const selectIsHardBlocked       = (s) => s.tenant.capWarning.hardBlocked
export const selectIsReadOnly          = (s) => s.tenant.status === 'readonly'
export const selectIsTrial             = (s) => s.tenant.status === 'trial'
export const selectIsActive            = (s) => s.tenant.status === 'active'
export const selectThemeReady          = (s) => s.tenant.themeReady
export const selectTenantLoading       = (s) => s.tenant.loading
export const selectTenantThemeLoading  = (s) => s.tenant.themeLoading
export const selectTenantError         = (s) => s.tenant.error
export const selectSubscriptionEndsAt  = (s) => s.tenant.subscriptionEndsAt
export const selectTrialEndsAt         = (s) => s.tenant.trialEndsAt
export const selectCafeName            = (s) => s.tenant.cafeName
export const selectCafeId              = (s) => s.tenant.cafeId

// Feature flag selectors — use these in components/routes
// e.g. const canDelivery = useSelector(selectFeatureDelivery)
export const selectFeatureDelivery  = (s) => s.tenant.features.delivery
export const selectFeatureGallery   = (s) => s.tenant.features.gallery
export const selectFeatureLoyalty   = (s) => s.tenant.features.loyalty
export const selectFeatureChat      = (s) => s.tenant.features.chat
export const selectFeatureAnalytics = (s) => s.tenant.features.analytics
export const selectFeatureTheme     = (s) => s.tenant.features.theme
export const selectFeatureApi       = (s) => s.tenant.features.api
export const selectMaxOrders        = (s) => s.tenant.features.maxOrders
export const selectMaxStaff         = (s) => s.tenant.features.maxStaff
export const selectMaxBranches      = (s) => s.tenant.features.maxBranches

export default tenantSlice.reducer