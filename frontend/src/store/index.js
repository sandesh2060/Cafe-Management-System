// src/store/index.js
//
// FIX: staffAuthSlice removed from the store.
// StaffLoginPage dispatches loginStaff from authSlice (alias for staffLogin thunk)
// which populates the `auth` slice — the staffAuth slice was never written to
// from StaffLoginPage and was dead weight. Removing it eliminates the confusion
// of two separate auth slices and the risk of importing from the wrong one.
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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: import.meta.env.DEV,
})

export default store

/** @typedef {ReturnType<typeof store.getState>} RootState */
/** @typedef {typeof store.dispatch} AppDispatch */