// src/modules/waiter/components/chat/WaiterChatPanel.jsx
import { useState, useEffect, useRef, useContext } from 'react'
import { useSelector }    from 'react-redux'
import { selectUser }     from '@store/slices/authSlice'
import api                from '@api/axios'
import socketService      from '@shared/services/socket.service'
import { ThemeContext }   from '@shared/context/ThemeContext'
import { Send, MessageSquare, ArrowLeft } from 'lucide-react'

const WaiterChatPanel = () => {
  const user        = useSelector(selectUser)
  const { isDark: dk } = useContext(ThemeContext)
  const [threads,  setThreads]  = useState([])
  const [active,   setActive]   = useState(null)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  useEffect(() => {
    api.get('/messages/threads')
      .then(d => setThreads(d.threads || d.data?.threads || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!active) return
    api.get(`/messages/${active.userId}`)
      .then(d => setMessages((d.messages || d.data?.messages || []).reverse()))
      .catch(() => {})

    const unsub = socketService.on('message:received', msg => {
      if (msg.fromUserId === active.userId)
        setMessages(prev => [...prev, msg])
    })
    return () => unsub()
  }, [active])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || !active) return
    setInput('')
    try {
      const res = await api.post('/messages/send', { toUserId: active.userId, content })
      setMessages(prev => [...prev, res.message || res.data?.message])
    } catch {}
  }

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col h-72
      ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>

      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b flex-shrink-0
        ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
        {active ? (
          <button onClick={() => setActive(null)}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors
              ${dk ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <ArrowLeft size={15} />
            {active.name}
          </button>
        ) : (
          <>
            <MessageSquare size={17} className={dk ? 'text-blue-400' : 'text-blue-500'} />
            <h2 className={`font-bold text-base ${dk ? 'text-white' : 'text-gray-900'}`}>
              Staff Chat
            </h2>
          </>
        )}
      </div>

      {/* Body */}
      {!active ? (
        <div className="flex-1 overflow-auto">
          {threads.length === 0 ? (
            <div className={`flex items-center justify-center h-full text-sm
              ${dk ? 'text-gray-600' : 'text-gray-400'}`}>
              No conversations yet
            </div>
          ) : (
            threads.map(t => (
              <button key={t.userId} onClick={() => setActive(t)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors
                  ${dk ? 'border-gray-800 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${dk ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  {t.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                  <p className={`text-xs truncate ${dk ? 'text-gray-500' : 'text-gray-400'}`}>{t.lastMessage}</p>
                </div>
                {t.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold
                                   flex items-center justify-center flex-shrink-0">
                    {t.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {messages.map((m, i) => {
              const mine = m.fromUserId === user?._id
              return (
                <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm
                    ${mine
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-br-sm'
                      : dk ? 'bg-gray-800 text-gray-200 rounded-bl-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                    {m.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div className={`flex gap-2 p-2 border-t flex-shrink-0
            ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Message…"
              className={`flex-1 text-sm px-3 py-2 rounded-xl outline-none transition-colors
                ${dk ? 'bg-gray-800 text-white placeholder-gray-600 focus:bg-gray-700'
                     : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-200'}`}
            />
            <button onClick={sendMessage}
              className="w-9 h-9 rounded-xl flex items-center justify-center
                         bg-gradient-to-br from-amber-500 to-orange-500 text-white
                         active:scale-90 transition-transform">
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default WaiterChatPanel