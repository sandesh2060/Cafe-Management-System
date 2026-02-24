// src/modules/manager/hooks/useManagerSocket.js
import { useEffect }        from 'react'
import { useDispatch }      from 'react-redux'
import socketService        from '@shared/services/socket.service'
import { playSound }        from '@shared/utils/soundPlayer'
import { addNotification }  from '@store/slices/notificationSlice'
import { selectRole }       from '@store/slices/authSlice'
import { useSelector }      from 'react-redux'

export const useManagerSocket = () => {
  const dispatch = useDispatch()
  const role     = useSelector(selectRole)

  useEffect(() => {
    const unsubs = [
      socketService.on('session:abandoned', ({ sessionId, tableId, notification }) => {
        playSound('sessionAbandoned', role)
        dispatch(addNotification({ ...notification, type: 'system', id: sessionId }))
      }),
      socketService.on('staff:help-request', ({ fromRole, tableId, message, notification }) => {
        playSound('staffAlert', role)
        dispatch(addNotification({ ...notification, type: 'system' }))
      }),
      socketService.on('table:freed', ({ tableId, notification }) => {
        dispatch(addNotification({ ...notification, type: 'system' }))
      }),
      socketService.on('order:new', ({ notification }) => {
        dispatch(addNotification({ ...notification, type: 'order' }))
      }),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [dispatch, role])
}