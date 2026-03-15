// file: src/modules/customer/hooks/useTableDetection.js

import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setSession }  from '@store/slices/tableSessionSlice'
import api             from '@api/axios'
import { ENDPOINTS }   from '@api/endpoints'

export const useTableDetection = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const detectTable = async () => {
    try {
      const payload = await api.get(ENDPOINTS.TABLE.SESSION_ACTIVE)
      const session = payload?.data?.session ?? payload?.session ?? null
      if (session?.tableId) {
        dispatch(setSession(session))
        navigate('/menu', { replace: true })
      } else {
        navigate('/detect', { replace: true })
      }
    } catch (err) {
      console.error('[useTableDetection] failed:', err)
      navigate('/detect', { replace: true })
    }
  }

  return { detectTable }
}
