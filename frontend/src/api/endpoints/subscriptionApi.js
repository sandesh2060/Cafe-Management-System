// frontend/src/api/endpoints/subscriptionApi.js
//
// ─── NEW FILE (Week 2) ────────────────────────────────────────────────────────
// RTK Query subscription endpoints.
// Cache TTL: 2 minutes — plan/status must stay fresh.
// Invalidated by socket event  subscription:activated  → see useSocket.js bridge.
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '@api/apiSlice'

export const subscriptionApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // GET /subscriptions/me — current plan, usage, expiry
    getSubscription: builder.query({
      query: () => '/subscriptions/me',
      providesTags: [{ type: 'Subscription', id: 'ME' }],
      keepUnusedDataFor: 120, // 2 minutes
    }),

    // GET /subscriptions/history — billing history
    getSubscriptionHistory: builder.query({
      query: () => '/subscriptions/history',
      providesTags: [{ type: 'Subscription', id: 'HISTORY' }],
      keepUnusedDataFor: 120,
    }),

    // POST /subscriptions/initiate — start eSewa payment flow
    // Returns { paymentUrl, amount, txRef } — frontend redirects to paymentUrl
    initiateSubscription: builder.mutation({
      query: (body) => ({
        url: '/subscriptions/initiate',
        method: 'POST',
        body,
      }),
    }),

    // POST /subscriptions/verify — redirect fallback after eSewa payment
    verifySubscription: builder.mutation({
      query: (body) => ({
        url: '/subscriptions/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Subscription', id: 'ME' },
        { type: 'Tenant', id: 'ME' },
      ],
    }),

    // POST /subscriptions/upgrade-seats — add extra staff seats
    upgradeSeats: builder.mutation({
      query: (body) => ({
        url: '/subscriptions/upgrade-seats',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Subscription', id: 'ME' }],
    }),

    // POST /subscriptions/add-branch — add branch add-on
    addBranch: builder.mutation({
      query: (body) => ({
        url: '/subscriptions/add-branch',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Subscription', id: 'ME' }],
    }),

    // POST /subscriptions/cancel — turn off auto-renew
    cancelSubscription: builder.mutation({
      query: () => ({
        url: '/subscriptions/cancel',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Subscription', id: 'ME' }],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetSubscriptionQuery,
  useGetSubscriptionHistoryQuery,
  useInitiateSubscriptionMutation,
  useVerifySubscriptionMutation,
  useUpgradeSeatsMutation,
  useAddBranchMutation,
  useCancelSubscriptionMutation,
} = subscriptionApi