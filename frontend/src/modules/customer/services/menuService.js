import api from '@api/axios'

export const menuService = {
  getMenu: async (cafeId) => {
    const data = await api.get(`/menu/${cafeId}`)
    return data
  },
}
