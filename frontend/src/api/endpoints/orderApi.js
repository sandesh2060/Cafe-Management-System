// frontend/src/api/endpoints/orderApi.js
//
// ─── NEW FILE (Week 2) ────────────────────────────────────────────────────────
// RTK Query order endpoints.
// Cache TTL: 30 seconds — kept fresh by socket invalidation.
// Socket events that bust this cache (wired in useSocket.js):
//   order:status_update  → invalidate { type: 'Order', id: orderId }
//   order:updated        → invalidate { type: 'Order', id: orderId }
//   order:cancelled      → invalidate { type: 'Order', id: orderId }
//   order:placed         → invalidate { type: 'Order', id: 'ACTIVE' }
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '@api/apiSlice'

export const orderApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // GET /orders/active — current active order for this table session
    getActiveOrder: builder.query({
      query: () => '/orders/active',
      providesTags: (result) =>
        result?.data?._id
          ? [{ type: 'Order', id: result.data._id }, { type: 'Order', id: 'ACTIVE' }]
          : [{ type: 'Order', id: 'ACTIVE' }],
      keepUnusedDataFor: 30,
    }),

    // GET /orders/history — customer order history
    getOrderHistory: builder.query({
      query: (params = {}) => ({
        url: '/orders/history',
        params,
      }),
      providesTags: [{ type: 'Order', id: 'HISTORY' }],
      keepUnusedDataFor: 60,
    }),

    // GET /orders/:id — single order detail
    getOrder: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Order', id }],
      keepUnusedDataFor: 30,
    }),

    // POST /orders — place new order
    placeOrder: builder.mutation({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      // Optimistic: invalidate active order so UI refetches immediately
      invalidatesTags: [{ type: 'Order', id: 'ACTIVE' }],
    }),

    // PATCH /orders/:id/cancel — cancel an order
    cancelOrder: builder.mutation({
      query: (id) => ({
        url: `/orders/${id}/cancel`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Order', id },
        { type: 'Order', id: 'ACTIVE' },
      ],
    }),

    // GET /orders — manager: all orders for this cafe (paginated)
    getAllOrders: builder.query({
      query: (params = {}) => ({ url: '/orders', params }),
      providesTags: [{ type: 'Order', id: 'ALL' }],
      keepUnusedDataFor: 30,
    }),

    // PATCH /orders/:id/status — manager/kitchen: update order status
    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      // Optimistic update — socket will also invalidate
      async onQueryStarted({ id, status }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          orderApi.util.updateQueryData('getOrder', id, (draft) => {
            if (draft?.data) draft.data.status = status
          })
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Order', id }],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetActiveOrderQuery,
  useGetOrderHistoryQuery,
  useGetOrderQuery,
  usePlaceOrderMutation,
  useCancelOrderMutation,
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} = orderApi