// frontend/src/api/endpoints/tenantApi.js
//
// ─── NEW FILE (Week 2) ────────────────────────────────────────────────────────
// RTK Query tenant + theme endpoints.
// Cache TTL: 10 minutes — very stable, changes rarely.
// Invalidated by socket event  theme:updated  → see useSocket.js bridge.
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '@api/apiSlice'

export const tenantApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // GET /tenants/theme — public, fetch cafe brandConfig (preset, logo, banners)
    // Called on app boot by ThemeContext to apply tenant branding.
    getTenantTheme: builder.query({
      query: () => '/tenants/theme',
      providesTags: [{ type: 'Tenant', id: 'THEME' }],
      keepUnusedDataFor: 600, // 10 minutes
    }),

    // GET /tenants/me — manager/owner: full tenant info (plan, features, status)
    getTenantMe: builder.query({
      query: () => '/tenants/me',
      providesTags: [{ type: 'Tenant', id: 'ME' }],
      keepUnusedDataFor: 120, // 2 minutes — plan/status changes matter
    }),

    // PATCH /tenants/theme — manager: save brandConfig changes
    updateTenantTheme: builder.mutation({
      query: (body) => ({
        url: '/tenants/theme',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Tenant', id: 'THEME' }],
    }),

    // PATCH /tenants/features — owner: toggle feature flags
    updateTenantFeatures: builder.mutation({
      query: (body) => ({
        url: '/tenants/features',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Tenant', id: 'ME' }],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetTenantThemeQuery,
  useGetTenantMeQuery,
  useUpdateTenantThemeMutation,
  useUpdateTenantFeaturesMutation,
} = tenantApi