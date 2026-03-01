// src/store/index.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer          from './slices/authSlice'
import staffAuthReducer     from './slices/staffAuthSlice'
import cartReducer          from './slices/cartSlice'
import menuReducer          from './slices/menuSlice'
import orderReducer         from './slices/orderSlice'
import loyaltyReducer       from './slices/loyaltySlice'
import notificationReducer  from './slices/notificationSlice'
import tableSessionReducer  from './slices/tableSessionSlice'
import callWaiterReducer    from './slices/callWaiterSlice'
import messagingReducer     from './slices/messagingSlice'

const store = configureStore({
  reducer: {
    auth:          authReducer,
    staffAuth:     staffAuthReducer,
    cart:          cartReducer,
    menu:          menuReducer,
    order:         orderReducer,
    loyalty:       loyaltyReducer,
    notifications: notificationReducer,
    tableSession:  tableSessionReducer,
    callWaiter:    callWaiterReducer,
    messaging:     messagingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: import.meta.env.DEV,
})

export default store

/** @typedef {ReturnType<typeof store.getState>} RootState */
/** @typedef {typeof store.dispatch} AppDispatch */