// src/modules/customer/services/menuService.js
import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const menuService = {
  /**
   * Fetch full menu for a given cafe
   * @param {string} cafeId
   * @returns {{ items: MenuItem[] }}
   */
  getMenu: async (cafeId) => {
    const { data } = await API.get(`/menu/${cafeId}`)
    return data // expected: { items: [...] }
  },
}