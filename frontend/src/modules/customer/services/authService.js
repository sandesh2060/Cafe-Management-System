// frontend/src/modules/customer/services/authService.js
//
// ─── CHANGES FROM ORIGINAL ────────────────────────────────────────────────────
// 1. loginUser now sends { username, passcode } — PIN auth
// 2. registerUser now sends { username, passcode, cafeId } — PIN register
// 3. Added forgotPasscode + verifyOtp — two-step OTP reset
// 4. Added addEmail + changePasscode — post-login profile actions
// 5. staffLogin added — separate endpoint for staff/manager/admin
// ─────────────────────────────────────────────────────────────────────────────

import api           from '@api/axios'
import { ENDPOINTS } from '@api/endpoints'

export const authService = {
  checkUsername: (username) =>
    api.post(ENDPOINTS.AUTH.CHECK_USERNAME, { username }),

  // PIN login — sends passcode not password
  loginUser: ({ username, passcode }) =>
    api.post(ENDPOINTS.AUTH.LOGIN, { username, passcode }),

  // PIN register — sends username + 4-digit passcode
  registerUser: ({ username, passcode, cafeId }) =>
    api.post(ENDPOINTS.AUTH.REGISTER, { username, passcode, cafeId }),

  guestLogin: (cafeId) =>
    api.post(ENDPOINTS.AUTH.GUEST_LOGIN, { cafeId }),

  logout: () =>
    api.post(ENDPOINTS.AUTH.LOGOUT),

  getMe: () =>
    api.get(ENDPOINTS.AUTH.ME),

  // Staff/manager/admin — password based
  staffLogin: ({ username, password }) =>
    api.post(ENDPOINTS.AUTH.STAFF_LOGIN, { username, password }),

  // Step 1: request OTP to email
  forgotPasscode: (username) =>
    api.post(ENDPOINTS.AUTH.FORGOT_PASSCODE, { username }),

  // Step 2: verify OTP + set new passcode
  verifyOtp: ({ username, otp, newPasscode }) =>
    api.post(ENDPOINTS.AUTH.VERIFY_OTP, { username, otp, newPasscode }),

  // Add email post-login (for OTP reset)
  addEmail: (email) =>
    api.patch(ENDPOINTS.AUTH.ADD_EMAIL, { email }),

  // Change passcode from profile settings
  changePasscode: ({ currentPasscode, newPasscode }) =>
    api.patch(ENDPOINTS.AUTH.CHANGE_PASSCODE, { currentPasscode, newPasscode }),
}