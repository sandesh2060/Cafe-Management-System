// frontend/src/api/endpoints/menuApi.js
//
// ─── NEW FILE (Week 2) ────────────────────────────────────────────────────────
// RTK Query menu endpoints.
// Cache TTL: 5 minutes (keepUnusedDataFor: 300).
// Invalidated by socket event  menu:updated  → see useSocket.js bridge.
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '@api/apiSlice'

export const menuApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // GET /menu — full menu for this cafe
    getMenu: builder.query({
      query: () => '/menu',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Menu', id: _id })),
              { type: 'Menu', id: 'LIST' },
            ]
          : [{ type: 'Menu', id: 'LIST' }],
      keepUnusedDataFor: 300, // 5 minutes
    }),

    // GET /menu/:id — single item detail
    getMenuItem: builder.query({
      query: (id) => `/menu/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Menu', id }],
      keepUnusedDataFor: 300,
    }),

    // GET /menu/categories — category list
    getCategories: builder.query({
      query: () => '/menu/categories',
      providesTags: [{ type: 'Menu', id: 'CATEGORIES' }],
      keepUnusedDataFor: 300,
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetMenuQuery,
  useGetMenuItemQuery,
  useGetCategoriesQuery,
  usePrefetch: useMenuPrefetch,
} = menuApi