// src/store/index.js
//
// ─── VENUE ENTRY FLOW CHANGES ─────────────────────────────────────────────────
// 1. ADDED: venueReducer — stores currently selected venue context
// 2. ALL other reducers + middleware UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

import { configureStore } from '@reduxjs/toolkit'
import authReducer         from './slices/authSlice'
import cartReducer         from './slices/cartSlice'
import menuReducer         from './slices/menuSlice'
import orderReducer        from './slices/orderSlice'
import loyaltyReducer      from './slices/loyaltySlice'
import notificationReducer from './slices/notificationSlice'
import toastReducer        from './slices/toastSlice'
import tableSessionReducer from './slices/tableSessionSlice'
import callWaiterReducer   from './slices/callWaiterSlice'
import messagingReducer    from './slices/messagingSlice'
import reviewReducer       from './slices/reviewSlice'
import galleryReducer      from './slices/gallerySlice'
import uiReducer           from './slices/uiSlice'
import followReducer       from './slices/followSlice'
import socialChatReducer   from './slices/socialChatSlice'
import venueReducer        from './slices/venueSlice'
import remoteOrderReducer from './slices/remoteOrderSlice'
// ★ RTK Query base API
import { api }             from '@api/apiSlice'

const store = configureStore({
  reducer: {
    auth:          authReducer,
    cart:          cartReducer,
    menu:          menuReducer,
    order:         orderReducer,
    loyalty:       loyaltyReducer,
    notifications: notificationReducer,
    toast:         toastReducer,
    tableSession:  tableSessionReducer,
    callWaiter:    callWaiterReducer,
    messaging:     messagingReducer,
    review:        reviewReducer,
    gallery:       galleryReducer,
    ui:            uiReducer,
    follow:        followReducer,
    socialChat:    socialChatReducer,
    venue:         venueReducer,
    remoteOrder: remoteOrderReducer,
    // ★ RTK Query — must use api.reducerPath as the key ('api')
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .concat(api.middleware), // ★ enables caching, invalidation, background refetch
  devTools: import.meta.env.DEV,
})

export default store

/** @typedef {ReturnType<typeof store.getState>} RootState */
/** @typedef {typeof store.dispatch} AppDispatch */