// frontend/src/store/slices/followSlice.js
//
// PATCH v2:
// ✅ removeFollower thunk added (DELETE /social/follower/:userId)
// ✅ blocked_by status handled in statusMap + optimistic list updates
// ✅ All 'mutual' references normalized to 'friends' (canonical value)
// ✅ isFriends() updated to only check 'friends' (was checking 'mutual' too)
// ✅ sendFollowRequest optimistic: followingCount +1 only after actual acceptance
//    (pending requests don't count as following in counts)

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import api from '@api/axios'

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchCustomers = createAsyncThunk('follow/fetchCustomers',
  async ({ page=1, search='', limit=20 } = {}, { rejectWithValue }) => {
    try { return await api.get(`/social/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const fetchPendingRequests = createAsyncThunk('follow/fetchPending',
  async (_, { rejectWithValue }) => {
    try { return await api.get('/social/follow/pending') }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const fetchFollowers = createAsyncThunk('follow/fetchFollowers',
  async ({ search='' } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/social/list/followers${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      return res?.data?.users ?? res?.data ?? []
    } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const fetchFollowing = createAsyncThunk('follow/fetchFollowing',
  async ({ search='' } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/social/list/following${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      return res?.data?.users ?? res?.data ?? []
    } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const fetchMutual = createAsyncThunk('follow/fetchMutual',
  async ({ search='' } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/social/list/mutual${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      return res?.data?.users ?? res?.data ?? []
    } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

// Prefetch all 3 in parallel — call when FollowSheet opens
export const prefetchFollowLists = () => async (dispatch) => {
  await Promise.all([
    dispatch(fetchFollowers()),
    dispatch(fetchFollowing()),
    dispatch(fetchMutual()),
  ])
}

export const sendFollowRequest = createAsyncThunk('follow/send',
  async (targetId, { rejectWithValue }) => {
    try { return await api.post(`/social/follow/${targetId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const acceptFollowRequest = createAsyncThunk('follow/accept',
  async (requesterId, { rejectWithValue }) => {
    try { return await api.post(`/social/follow/${requesterId}/accept`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const declineFollowRequest = createAsyncThunk('follow/decline',
  async (requesterId, { rejectWithValue }) => {
    try { return await api.post(`/social/follow/${requesterId}/decline`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const unfollowUser = createAsyncThunk('follow/unfollow',
  async (targetId, { rejectWithValue }) => {
    try { return await api.delete(`/social/follow/${targetId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

// FIX Bug 8: remove someone from MY followers (different from unfollow)
export const removeFollower = createAsyncThunk('follow/removeFollower',
  async (userId, { rejectWithValue }) => {
    try { return await api.delete(`/social/follower/${userId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

export const blockUser = createAsyncThunk('follow/block',
  async (targetId, { rejectWithValue }) => {
    try { return await api.post(`/social/block/${targetId}`) }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed') }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const followSlice = createSlice({
  name: 'follow',
  initialState: {
    customers:       [],
    total:           0,
    page:            1,
    loading:         false,
    error:           null,
    pendingRequests: [],
    onlineUserIds:   {},
    statusMap:       {},

    // Cached social lists — null = not yet fetched
    lists: {
      followers: null,
      following: null,
      mutual:    null,
    },
    listsLoading: {
      followers: false,
      following: false,
      mutual:    false,
    },
    // Counts for profile header — updated from API + optimistically
    socialCounts: {
      followersCount: 0,
      followingCount: 0,
      mutualCount:    0,
    },
  },

  reducers: {
    setUserOnline:  (state, { payload: userId }) => { state.onlineUserIds[userId] = true },
    setUserOffline: (state, { payload: userId }) => { delete state.onlineUserIds[userId] },

    updateStatus: (state, { payload: { userId, status } }) => {
      // Normalize any incoming 'mutual' to 'friends'
      const normalized = status === 'mutual' ? 'friends' : status
      state.statusMap[userId] = normalized
      const u = state.customers.find(c => c._id === userId)
      if (u) u.followStatus = normalized
    },

    addPendingRequest: (state, { payload }) => {
      if (!state.pendingRequests.find(r => r._id === payload._id))
        state.pendingRequests.unshift(payload)
    },

    setSocialCounts: (state, { payload }) => {
      state.socialCounts = {
        followersCount: payload.followersCount ?? 0,
        followingCount: payload.followingCount ?? 0,
        mutualCount:    payload.mutualCount    ?? 0,
      }
    },

    invalidateLists: (state, { payload }) => {
      const tabs = payload ?? ['followers', 'following', 'mutual']
      for (const tab of tabs) state.lists[tab] = null
    },
  },

  extraReducers: b => {
    // fetchCustomers
    b.addCase(fetchCustomers.pending,   s => { s.loading = true; s.error = null })
     .addCase(fetchCustomers.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })
     .addCase(fetchCustomers.fulfilled, (s, { payload }) => {
       s.loading = false
       const d = payload?.data ?? payload
       // Normalize all 'mutual' → 'friends' from backend
       const users = (d?.users ?? []).map(u => ({
         ...u,
         followStatus: u.followStatus === 'mutual' ? 'friends' : (u.followStatus ?? 'none'),
         isMutual: u.followStatus === 'friends' || u.followStatus === 'mutual',
       }))
       s.customers = users
       s.total     = d?.total ?? 0
       s.page      = d?.page  ?? 1
       const map = {}
       for (const u of s.customers) map[u._id] = u.followStatus ?? 'none'
       s.statusMap = { ...s.statusMap, ...map }
     })

    // fetchPendingRequests
    b.addCase(fetchPendingRequests.fulfilled, (s, { payload }) => {
      s.pendingRequests = payload?.data ?? []
    })

    // ── List fetches ──────────────────────────────────────────────────────────
    b.addCase(fetchFollowers.pending,   s => { s.listsLoading.followers = true })
     .addCase(fetchFollowers.rejected,  s => { s.listsLoading.followers = false })
     .addCase(fetchFollowers.fulfilled, (s, { payload }) => {
       s.listsLoading.followers  = false
       s.lists.followers         = payload
       s.socialCounts.followersCount = payload.length
     })

    b.addCase(fetchFollowing.pending,   s => { s.listsLoading.following = true })
     .addCase(fetchFollowing.rejected,  s => { s.listsLoading.following = false })
     .addCase(fetchFollowing.fulfilled, (s, { payload }) => {
       s.listsLoading.following  = false
       s.lists.following         = payload
       s.socialCounts.followingCount = payload.length
     })

    b.addCase(fetchMutual.pending,   s => { s.listsLoading.mutual = true })
     .addCase(fetchMutual.rejected,  s => { s.listsLoading.mutual = false })
     .addCase(fetchMutual.fulfilled, (s, { payload }) => {
       s.listsLoading.mutual  = false
       s.lists.mutual         = payload
       s.socialCounts.mutualCount = payload.length
     })

    // sendFollowRequest — optimistic: mark as pending (NOT +followingCount yet)
    b.addCase(sendFollowRequest.fulfilled, (s, { meta }) => {
      s.statusMap[meta.arg] = 'pending'
      const u = s.customers.find(c => c._id === meta.arg)
      if (u) u.followStatus = 'pending'
      // Don't increment followingCount — pending ≠ following
      s.lists.following = null  // invalidate so next open refetches
    })

    // acceptFollowRequest — they now follow me AND we are friends
    b.addCase(acceptFollowRequest.fulfilled, (s, { meta }) => {
      s.pendingRequests     = s.pendingRequests.filter(r => r._id !== meta.arg)
      s.statusMap[meta.arg] = 'friends'   // canonical value
      const u = s.customers.find(c => c._id === meta.arg)
      if (u) { u.followStatus = 'friends'; u.isMutual = true }
      // Optimistic count updates
      s.socialCounts.mutualCount    = Math.max(0, s.socialCounts.mutualCount + 1)
      s.socialCounts.followingCount = Math.max(0, s.socialCounts.followingCount + 1)
      // Invalidate lists to refetch accurate data
      s.lists.followers = null
      s.lists.mutual    = null
      s.lists.following = null
    })

    // declineFollowRequest
    b.addCase(declineFollowRequest.fulfilled, (s, { meta }) => {
      s.pendingRequests = s.pendingRequests.filter(r => r._id !== meta.arg)
    })

    // unfollowUser — I stop following them
    b.addCase(unfollowUser.fulfilled, (s, { meta }) => {
      const userId = meta.arg
      const prevStatus = s.statusMap[userId]
      s.statusMap[userId] = 'none'
      const u = s.customers.find(c => c._id === userId)
      if (u) { u.followStatus = 'none'; u.isMutual = false }
      // Optimistic count updates
      s.socialCounts.followingCount = Math.max(0, s.socialCounts.followingCount - 1)
      if (prevStatus === 'friends') {
        s.socialCounts.mutualCount = Math.max(0, s.socialCounts.mutualCount - 1)
      }
      // Update cached lists immediately
      if (s.lists.following) s.lists.following = s.lists.following.filter(x => x._id !== userId)
      if (s.lists.mutual)    s.lists.mutual    = s.lists.mutual.filter(x => x._id !== userId)
      if (s.lists.followers) s.lists.followers = s.lists.followers.map(x =>
        x._id === userId ? { ...x, isMutual: false } : x
      )
    })

    // removeFollower — they stop following me (I removed them)
    b.addCase(removeFollower.fulfilled, (s, { meta }) => {
      const userId = meta.arg
      const prevStatus = s.statusMap[userId]
      // Their status from MY perspective: they were following me.
      // After removal they are no longer in my followers.
      // If we were friends (mutual), I'm now following them but they don't follow me.
      if (prevStatus === 'friends') {
        s.statusMap[userId] = 'following'
        const u = s.customers.find(c => c._id === userId)
        if (u) { u.followStatus = 'following'; u.isMutual = false }
        s.socialCounts.mutualCount    = Math.max(0, s.socialCounts.mutualCount - 1)
        s.socialCounts.followersCount = Math.max(0, s.socialCounts.followersCount - 1)
        if (s.lists.mutual)    s.lists.mutual    = s.lists.mutual.filter(x => x._id !== userId)
        if (s.lists.following) s.lists.following = s.lists.following.map(x =>
          x._id === userId ? { ...x, isMutual: false } : x
        )
      } else {
        // They were following me but I wasn't following them
        s.socialCounts.followersCount = Math.max(0, s.socialCounts.followersCount - 1)
      }
      if (s.lists.followers) s.lists.followers = s.lists.followers.filter(x => x._id !== userId)
    })

    // blockUser
    b.addCase(blockUser.fulfilled, (s, { meta }) => {
      s.statusMap[meta.arg] = 'blocked'
      s.customers = s.customers.filter(c => c._id !== meta.arg)
      s.lists.followers = s.lists.followers?.filter(x => x._id !== meta.arg) ?? null
      s.lists.following = s.lists.following?.filter(x => x._id !== meta.arg) ?? null
      s.lists.mutual    = s.lists.mutual?.filter(x => x._id !== meta.arg)    ?? null
    })
  },
})

export const {
  setUserOnline, setUserOffline, updateStatus, addPendingRequest,
  setSocialCounts, invalidateLists,
} = followSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCustomers        = s => s.follow.customers
export const selectFollowLoading    = s => s.follow.loading
export const selectPendingRequests  = s => s.follow.pendingRequests
export const selectStatusMap        = s => s.follow.statusMap
export const selectFollowStatus     = userId => s => s.follow.statusMap[userId] ?? 'none'
export const isOnline               = userId => s => !!s.follow.onlineUserIds[userId]
export const selectSocialCounts     = s => s.follow.socialCounts
export const selectFollowLists      = s => s.follow.lists
export const selectListsLoading     = s => s.follow.listsLoading

export const selectOnlineUsers = createSelector(
  s => s.follow.onlineUserIds,
  ids => new Set(Object.keys(ids))
)

// FIX: canonical check — only 'friends', never 'mutual'
export const isFriends = status => status === 'friends'

export default followSlice.reducer