// src/modules/waiter/components/chat/WaiterChatPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { useSelector }                  from 'react-redux'
import { selectUser }                   from '@store/slices/authSlice'
import api                              from '@api/axios'
import socketService                    from '@shared/services/socket.service'
import { COLORS }                       from '@colors'
import { Send, MessageSquare }          from 'lucide-react'

const WaiterChatPanel = () => {
  const user      = useSelector(selectUser)
  const [threads, setThreads] = useState([])
  const [active,  setActive]  = useState(null)
  const [messages, setMessages] = useState([])
  const [input,   setInput]   = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    api.get('/messages/threads').then((d) => setThreads(d.threads || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!active) return
    api.get(`/messages/${active.userId}`).then((d) => setMessages(d.messages?.reverse() || [])).catch(() => {})

    const unsub = socketService.on('message:received', (msg) => {
      if (msg.fromUserId === active.userId) setMessages((prev) => [...prev, msg])
    })
    return () => unsub()
  }, [active])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !active) return
    const content = input.trim()
    setInput('')
    const msg = await api.post('/messages/send', { toUserId: active.userId, content })
    setMessages((prev) => [...prev, msg.message])
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-72 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <MessageSquare size={18} color={COLORS.brew.light} />
        <h2 className="font-bold text-brew text-base">Staff Chat</h2>
      </div>

      {!active ? (
        // Thread list
        <div className="flex-1 overflow-auto">
          {threads.length === 0 ? (
            <div className="flex items-center justify-center h-full text-brew-soft text-sm">No conversations yet</div>
          ) : (
            threads.map((t) => (
              <button key={t.userId} onClick={() => setActive(t)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 hover:bg-cream-dark">
                <div className="w-9 h-9 rounded-full bg-brew-light/20 flex items-center justify-center text-sm font-bold text-brew flex-shrink-0">
                  {t.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brew">{t.name}</p>
                  <p className="text-xs text-brew-soft truncate">{t.lastMessage}</p>
                </div>
                {t.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-saffron text-white text-[10px] font-bold flex items-center justify-center">
                    {t.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        // Chat view
        <>
          <button onClick={() => setActive(null)}
            className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-sm text-brew-soft hover:bg-cream-dark flex-shrink-0">
            ← {active.name}
          </button>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {messages.map((m, i) => {
              const mine = m.fromUserId === user?._id
              return (
                <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    mine ? 'bg-saffron text-white rounded-br-sm' : 'bg-cream-dark text-brew rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100 flex-shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message…"
              className="flex-1 text-sm px-3 py-2 rounded-xl bg-cream-dark outline-none"
            />
            <button onClick={sendMessage}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-saffron text-white">
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default WaiterChatPanel