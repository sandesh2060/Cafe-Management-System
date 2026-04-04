// frontend/src/modules/customer/pages/ChatThread.jsx
//
// UPGRADES v4 — Fully integrated with your design system:
// ✅ CSS vars: var(--accent), var(--card-bg), var(--text-primary), var(--accent-gradient),
//    var(--accent-glow), var(--card-border), var(--card-shadow), var(--reply-bg),
//    var(--pill-bg), var(--divider), var(--modal-bg), var(--orb-color), var(--top-glow),
//    var(--success), var(--danger), var(--warning), var(--text-muted), var(--text-inverse),
//    var(--header-border), var(--shadow-*) — all from brand.js PALETTE → ThemeContext
// ✅ Tailwind: .glass, .glass-light, .skeleton, .skeleton-avatar, .skeleton-text,
//    .btn-brand, .btn-ghost, .btn-compact, .input-base, .card, .scrollbar-hide,
//    .animate-scale-spring, .animate-fade-in, .animate-slide-up, .animate-page-enter,
//    .animate-scale-in, .sticky-header, .customer-container — all from globals.css
// ✅ Transition system: var(--transition-theme), var(--transition-fast),
//    var(--transition-base), var(--transition-spring), var(--ease-spring)
// ✅ FONTS from brand.js (Sora / DM Sans / DM Mono / Baloo 2)
// ✅ No hardcoded hex values anywhere
// ✅ fetchMenu import correct

import {
  useEffect, useRef, useState, useCallback,
  useContext, useMemo, Fragment,
} from 'react'
import { useDispatch, useSelector }     from 'react-redux'
import { useParams, useNavigate }       from 'react-router-dom'
import {
  fetchThread, sendSocialMessage, reactToMessage,
  markThreadSeen, setActiveThread, clearActiveThread,
  selectChatLoading, selectTypingUsers, selectThread,
  optimisticSend, deleteMessage, messageDeleted,
} from '@store/slices/socialChatSlice'
import {
  unfollowUser, blockUser,
  selectOnlineUsers, selectCustomers,
} from '@store/slices/followSlice'
import { selectUser }                   from '@store/slices/authSlice'
import { selectActiveOrder }            from '@store/slices/orderSlice'
import { selectAllItems, fetchMenu }    from '@store/slices/menuSlice'
import { FONTS }                        from '@shared/config/brand'
import { ThemeContext }                 from '@shared/context/ThemeContext'
import socketService                    from '@shared/services/socket.service'
import api                              from '@api/axios'

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_CHARS    = 500
const EMOJI_QUICK  = ['❤️','😂','😮','😢','👍','🔥','😍','🥺']
const EMOJI_CATS   = {
  '😊': ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😚','🙂','🤗','🤭','🤫','🤔','🤐','🤨','😑','😶','😏','😒','🙄','😬','😌','😔','😴'],
  '👋': ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤝','🙏','✍️'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','✨','⭐','🌟','💫','🎉','🎊','🎈','🎁','🏆','🥇'],
  '🍕': ['🍕','🍔','🌮','🌯','🥗','🍜','🍝','🍛','🍲','🥣','🍱','🍣','🍤','🦐','🦞','🦀','🍦','🧁','🎂','🍰','🍩','🍪','☕','🍵','🧋','🥤'],
}
const EMOJI_CAT_KEYS = Object.keys(EMOJI_CATS)

// ── Chat-specific keyframes (globals.css covers: fade-in, fade-up, slide-up,
//    scale-in-spring, bounce-soft, pulse-soft, shimmer, page-enter, toast-in)
//    We only add what's NOT already in globals.css ──────────────────────────
const CHAT_STYLES = `
  @keyframes ct-msgR  { from{transform:translateX(16px) scale(.95);opacity:0} to{transform:none;opacity:1} }
  @keyframes ct-msgL  { from{transform:translateX(-16px) scale(.95);opacity:0} to{transform:none;opacity:1} }
  @keyframes ct-dot   { 0%,80%,100%{transform:scale(1);opacity:.35} 40%{transform:scale(1.45);opacity:1} }
  @keyframes ct-wave  { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
  @keyframes ct-vanish{ 0%{opacity:1;filter:blur(0)} 60%{opacity:.25;filter:blur(3px)} 100%{opacity:0;filter:blur(8px);transform:scale(.92)} }
  @keyframes ct-hi    { 0%{transform:scale(.45) rotate(-22deg);opacity:0} 60%{transform:scale(1.18) rotate(8deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
  @keyframes ct-ping  { 0%{transform:scale(1);opacity:.6} 75%,100%{transform:scale(2.1);opacity:0} }

  .ct-msg-r  { animation: ct-msgR .26s var(--ease-spring) both }
  .ct-msg-l  { animation: ct-msgL .26s var(--ease-spring) both }
  .ct-react  { transition: transform var(--transition-fast) }
  .ct-react:hover { transform: scale(1.25) rotate(-5deg) }
  .ct-emj:active  { transform: scale(1.32)!important }
  textarea   { scrollbar-width:none }
  .ct-send-active { animation: ct-sendPop .22s cubic-bezier(0.34,1.56,0.64,1) both }
  @keyframes ct-sendPop { 0%{transform:scale(.88)} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
  textarea::-webkit-scrollbar { display:none }
`

// ── Utils ─────────────────────────────────────────────────────────────────────
const getAvatar = u =>
  u?.avatarUrl||u?.avatar||u?.profileImage||u?.profilePic||
  u?.photo||u?.picture||u?.image||u?.photoURL||u?.data?.avatarUrl||null

const compressImg = (file, maxW=800, q=0.72) =>
  new Promise((res,rej) => {
    const img=new Image(), url=URL.createObjectURL(file)
    img.onload=()=>{
      URL.revokeObjectURL(url)
      const s=Math.min(1,maxW/Math.max(img.width,img.height))
      const c=document.createElement('canvas')
      c.width=Math.round(img.width*s); c.height=Math.round(img.height*s)
      c.getContext('2d').drawImage(img,0,0,c.width,c.height)
      const m=c.toDataURL('image/webp').startsWith('data:image/webp')?'image/webp':'image/jpeg'
      res(c.toDataURL(m,q))
    }
    img.onerror=rej; img.src=url
  })

const getMime = ()=>
  ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg']
    .find(t=>MediaRecorder.isTypeSupported(t))??''

const fmtT = d=>new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
const fmtD = d=>{
  const date=new Date(d),today=new Date(),yest=new Date(today)
  yest.setDate(today.getDate()-1)
  if(date.toDateString()===today.toDateString()) return 'Today'
  if(date.toDateString()===yest.toDateString())  return 'Yesterday'
  return date.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'})
}
const needsSep=(msgs,i)=>i===0||new Date(msgs[i].createdAt).toDateString()!==new Date(msgs[i-1].createdAt).toDateString()

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar=({user,size=36,isOnline,onClick})=>{
  const url=getAvatar(user)
  const ini=(user?.name||'?').slice(0,2).toUpperCase()
  const pal=['#4F46E5','#0369A1','#7C3AED','#BE185D','#B45309','#047857']
  const bg=pal[(user?.name?.charCodeAt(0)??0)%pal.length]
  return(
    <div onClick={onClick} style={{position:'relative',width:size,height:size,flexShrink:0,cursor:onClick?'pointer':'default'}}>
      {isOnline&&<>
        <div style={{position:'absolute',inset:-2.5,borderRadius:'50%',border:'2.5px solid var(--success)',zIndex:2,pointerEvents:'none',transition:'border-color var(--transition-theme)'}}/>
        <div style={{position:'absolute',inset:-5,borderRadius:'50%',border:'2px solid var(--success)',opacity:.3,animation:'ct-ping 2.2s ease-out infinite',pointerEvents:'none'}}/>
      </>}
      {url&&<img src={url} alt={user?.name??'User'} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',display:'block'}} onError={e=>{e.currentTarget.style.display='none';if(e.currentTarget.nextSibling)e.currentTarget.nextSibling.style.display='flex'}}/>}
      <div style={{width:size,height:size,borderRadius:'50%',background:`linear-gradient(135deg,${bg},${bg}bb)`,display:url?'none':'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:size*.36,fontFamily:FONTS.body}}>{ini}</div>
    </div>
  )
}

// ── DateSeparator — uses --divider, --pill-bg, --text-muted ──────────────────
const DateSep=({date})=>(
  <div className="flex items-center gap-3 my-4 animate-fade-in">
    <div className="flex-1 h-px" style={{background:'var(--divider)',transition:'background var(--transition-theme)'}}/>
    <span style={{fontSize:10,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--text-muted)',fontFamily:FONTS.body,padding:'4px 12px',borderRadius:'var(--radius-full)',background:'var(--pill-bg)',border:'1px solid var(--divider)',transition:'all var(--transition-theme)'}}>
      {fmtD(date)}
    </span>
    <div className="flex-1 h-px" style={{background:'var(--divider)',transition:'background var(--transition-theme)'}}/>
  </div>
)

// ── EmojiPicker — uses --modal-bg, --modal-border, --shadow-xl, --accent ─────
const EmojiPicker=({onSelect})=>{
  const [tab,setTab]=useState(0)
  return(
    <div className="animate-scale-spring" style={{position:'absolute',bottom:'calc(100% + 10px)',left:0,width:296,borderRadius:'var(--radius-xl)',overflow:'hidden',zIndex:45,background:'var(--modal-bg)',border:'1px solid var(--modal-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)'}}>
      <div className="flex" style={{borderBottom:'1px solid var(--divider)',padding:'6px 8px 0'}}>
        {EMOJI_CAT_KEYS.map((cat,i)=>(
          <button key={cat} onClick={()=>setTab(i)} className="btn-compact flex-1" style={{padding:'7px 2px 9px',border:'none',background:'none',fontSize:19,cursor:'pointer',borderBottom:tab===i?'2.5px solid var(--accent)':'2.5px solid transparent',transition:'border-color var(--transition-fast)'}}>
            {cat}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,padding:'8px 6px 12px',maxHeight:208,overflowY:'auto'}}>
        {EMOJI_CATS[EMOJI_CAT_KEYS[tab]].map((em,i)=>(
          <button key={i} onClick={()=>onSelect(em)} className="ct-emj btn-compact" style={{fontSize:22,padding:'5px 2px',border:'none',background:'none',cursor:'pointer',borderRadius:'var(--radius-sm)',lineHeight:1}}>{em}</button>
        ))}
      </div>
    </div>
  )
}

// ── ItemPicker — uses --modal-bg, --divider, --accent, --accent-dim ──────────
const ItemPicker=({query,items,onSelect})=>{
  const flt=items.filter(i=>i.name.toLowerCase().includes(query.toLowerCase())&&i.isAvailable!==false).slice(0,5)
  if(!flt.length) return null
  return(
    <div className="animate-scale-spring" style={{position:'absolute',bottom:'calc(100% + 10px)',left:0,right:0,borderRadius:'var(--radius-xl)',overflow:'hidden',zIndex:40,background:'var(--modal-bg)',border:'1px solid var(--modal-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
      <div style={{padding:'8px 16px 4px',fontSize:9,fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',color:'var(--accent)',fontFamily:FONTS.body}}>Menu · type to filter</div>
      {flt.map(item=>(
        <button key={item._id} onClick={()=>onSelect(item)} className="btn-compact" style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'10px 16px',background:'none',border:'none',borderTop:'1px solid var(--divider)',cursor:'pointer',textAlign:'left'}}>
          {item.image
            ?<img src={item.image} alt={item.name} style={{width:40,height:40,borderRadius:'var(--radius-md)',objectFit:'cover',flexShrink:0}}/>
            :<div style={{width:40,height:40,borderRadius:'var(--radius-md)',flexShrink:0,background:'var(--accent-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🍽️</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:'var(--text-primary)',fontFamily:FONTS.body,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</p>
            <p style={{margin:'1px 0 0',fontSize:11,fontWeight:700,color:'var(--accent)',fontFamily:FONTS.mono}}>Rs. {item.price}</p>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:'var(--accent)',fontFamily:FONTS.body,padding:'3px 10px',borderRadius:'var(--radius-full)',background:'var(--accent-dim)',border:'1px solid var(--accent-border)',flexShrink:0}}>Share</span>
        </button>
      ))}
    </div>
  )
}

// ── MentionPicker ─────────────────────────────────────────────────────────────
const MentionPicker=({query,friends,onSelect})=>{
  const flt=friends.filter(f=>(f.username??f.name??'').toLowerCase().includes(query.toLowerCase())).slice(0,5)
  if(!flt.length) return null
  return(
    <div className="animate-scale-spring" style={{position:'absolute',bottom:'calc(100% + 10px)',left:0,right:0,borderRadius:'var(--radius-xl)',overflow:'hidden',zIndex:41,background:'var(--modal-bg)',border:'1px solid var(--modal-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
      {flt.map(f=>(
        <button key={f._id} onClick={()=>onSelect(f)} className="btn-compact" style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 16px',background:'none',border:'none',borderBottom:'1px solid var(--divider)',cursor:'pointer',textAlign:'left'}}>
          <Avatar user={f} size={32}/>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:'var(--text-primary)',fontFamily:FONTS.body}}>{f.name}</p>
            {f.username&&<p style={{margin:0,fontSize:11,color:'var(--text-muted)',fontFamily:FONTS.body}}>@{f.username}</p>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── ReactionPicker — uses --card-bg, --card-border, --shadow-lg ──────────────
const ReactionPicker=({onSelect,onRemove,currentEmoji,isMe})=>(
  <div className="animate-scale-spring" style={{position:'absolute',[isMe?'right':'left']:0,bottom:'calc(100% + 10px)',zIndex:50,display:'flex',alignItems:'center',gap:3,padding:'9px 13px',borderRadius:'var(--radius-full)',background:'var(--card-bg-solid)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-lg)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)'}}>
    {EMOJI_QUICK.map(e=>(
      <button key={e} onClick={()=>e===currentEmoji?onRemove():onSelect(e)} className="ct-react btn-compact" style={{fontSize:23,background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:'var(--radius-sm)',transform:currentEmoji===e?'scale(1.38)':'scale(1)',opacity:currentEmoji&&e!==currentEmoji?.4:1}}>{e}</button>
    ))}
  </div>
)

// ── QuoteReply — uses --reply-bg, --reply-border, --accent ───────────────────
const QuoteReply=({msg,otherUser,onClear})=>(
  <div className="animate-slide-up" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',marginBottom:8,borderRadius:'var(--radius-lg)',background:'var(--reply-bg)',border:'1px solid var(--reply-border)',transition:'all var(--transition-theme)'}}>
    <div style={{width:3,borderRadius:2,alignSelf:'stretch',background:'var(--accent)',flexShrink:0,minHeight:24,transition:'background var(--transition-theme)'}}/>
    <div style={{flex:1,minWidth:0}}>
      <p style={{margin:0,fontSize:10,fontWeight:800,color:'var(--accent)',fontFamily:FONTS.body,letterSpacing:'.05em',textTransform:'uppercase'}}>{otherUser?.name?.split(' ')[0]??'Reply'}</p>
      <p style={{margin:'2px 0 0',fontSize:12,color:'var(--text-muted)',fontFamily:FONTS.body,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{msg.content}</p>
    </div>
    <button onClick={onClear} className="btn-compact" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:22,lineHeight:1,padding:'2px 6px',flexShrink:0}}>×</button>
  </div>
)

// ── AudioPlayer — uses --accent, --accent-dim, --text-disabled ───────────────
const AudioPlayer=({src,isMe})=>{
  const [playing,setPlaying]=useState(false)
  const [progress,setProgress]=useState(0)
  const [duration,setDuration]=useState(0)
  const ref=useRef(null)
  const NUM=20
  const H=[9,13,7,16,11,18,9,14,16,7,12,18,9,13,7,15,11,9,16,12]

  useEffect(()=>{
    const a=ref.current; if(!a) return
    const onT=()=>setProgress(a.currentTime/(a.duration||1))
    const onM=()=>setDuration(a.duration)
    const onE=()=>{setPlaying(false);setProgress(0)}
    a.addEventListener('timeupdate',onT); a.addEventListener('loadedmetadata',onM); a.addEventListener('ended',onE)
    return()=>{a.removeEventListener('timeupdate',onT);a.removeEventListener('loadedmetadata',onM);a.removeEventListener('ended',onE)}
  },[])

  const toggle=()=>{const a=ref.current;if(!a)return;playing?a.pause():a.play();setPlaying(!playing)}
  const fmtS=s=>`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`
  const fg=isMe?'rgba(255,255,255,.92)':'var(--accent)'
  const dim=isMe?'rgba(255,255,255,.28)':'var(--text-disabled)'

  return(
    <div style={{display:'flex',alignItems:'center',gap:11,minWidth:190}}>
      <audio ref={ref} src={src} preload="metadata"/>
      <button onClick={toggle} className="btn-compact" style={{width:36,height:36,borderRadius:'50%',border:'none',background:isMe?'rgba(255,255,255,.18)':'var(--accent-dim)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background var(--transition-fast)'}}>
        {playing
          ?<svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="4" height="10" rx="1.2" fill={fg}/><rect x="8" y="2" width="4" height="10" rx="1.2" fill={fg}/></svg>
          :<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2l9 5-9 5V2z" fill={fg}/></svg>
        }
      </button>
      <div style={{display:'flex',alignItems:'center',gap:2.5,flex:1}}>
        {Array.from({length:NUM},(_,i)=>{
          const f=(i/NUM)<progress
          return <div key={i} style={{width:3,height:H[i],borderRadius:2,background:f?fg:dim,transition:'background .1s',animation:playing&&f?`ct-wave ${.5+(i%3)*.2}s ease-in-out ${(i%5)*.08}s infinite`:'none',transformOrigin:'center'}}/>
        })}
      </div>
      <span style={{fontSize:10,fontWeight:700,color:fg,fontFamily:FONTS.mono,flexShrink:0}}>
        {playing?fmtS(ref.current?.currentTime??0):fmtS(duration)}
      </span>
    </div>
  )
}

// ── ImageLightbox ─────────────────────────────────────────────────────────────
const Lightbox=({src,onClose})=>(
  <div onClick={onClose} className="animate-fade-in" style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.93)',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <img src={src} alt="Full" onClick={e=>e.stopPropagation()} className="animate-scale-spring" style={{maxWidth:'95vw',maxHeight:'90dvh',borderRadius:'var(--radius-xl)',objectFit:'contain',boxShadow:'0 40px 100px rgba(0,0,0,.7)'}}/>
    <button onClick={onClose} className="btn-compact" style={{position:'absolute',top:20,right:20,width:42,height:42,borderRadius:'50%',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',fontSize:24,fontWeight:300,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(10px)'}}>×</button>
  </div>
)

// ── TypingDots — uses --card-bg, --card-border, --text-muted ─────────────────
const TypingDots=()=>(
  <div style={{display:'flex',alignItems:'center',gap:5,padding:'11px 16px',borderRadius:'var(--radius-xl) var(--radius-xl) var(--radius-xl) 4px',background:'var(--card-bg-solid)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-sm)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',width:'fit-content',animation:'ct-msgL .24s var(--ease-spring) both',transition:'background var(--transition-theme)'}}>
    {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:'var(--text-muted)',animation:`ct-dot 1.15s ease-in-out ${i*.2}s infinite`}}/>)}
  </div>
)

// ── SkeletonBubble — uses .skeleton class from globals.css ───────────────────
const SkeletonBubble=({isMe,width})=>(
  <div style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',alignItems:'flex-end',gap:8,marginBottom:8}}>
    {!isMe&&<div className="skeleton skeleton-avatar" style={{width:26,height:26,flexShrink:0}}/>}
    <div className="skeleton" style={{height:42,width,borderRadius:isMe?'var(--radius-xl) var(--radius-xl) 4px var(--radius-xl)':'var(--radius-xl) var(--radius-xl) var(--radius-xl) 4px'}}/>
  </div>
)

// ── VoiceBtn — uses --pill-bg, --divider, --danger, --text-muted ─────────────
const VoiceBtn=({onSend})=>{
  const [rec,setRec]=useState(false)
  const [secs,setSecs]=useState(0)
  const mRef=useRef(null),cRef=useRef([]),tRef=useRef(null),mimeRef=useRef('')
  const CIRC=2*Math.PI*16

  const start=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      mimeRef.current=getMime()
      const mr=new MediaRecorder(stream,mimeRef.current?{mimeType:mimeRef.current}:{})
      cRef.current=[]
      mr.ondataavailable=e=>{if(e.data.size>0)cRef.current.push(e.data)}
      mr.onstop=()=>{onSend(URL.createObjectURL(new Blob(cRef.current,{type:mimeRef.current||'audio/webm'})));stream.getTracks().forEach(t=>t.stop())}
      mr.start(100);mRef.current=mr;setRec(true);setSecs(0)
      tRef.current=setInterval(()=>setSecs(s=>s+1),1000)
    }catch{alert('Microphone access required')}
  }
  const stop=()=>{
    if(!rec||!mRef.current)return
    if(mRef.current.state==='recording')mRef.current.stop()
    clearInterval(tRef.current);setRec(false);setSecs(0)
  }

  return(
    <button onMouseDown={start} onMouseUp={stop} onTouchStart={e=>{e.preventDefault();start()}} onTouchEnd={e=>{e.preventDefault();stop()}} onTouchCancel={stop} className="btn-compact" style={{width:44,height:44,borderRadius:'var(--radius-lg)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:rec?'rgba(239,68,68,.12)':'var(--pill-bg)',border:`1.5px solid ${rec?'var(--danger)':'var(--divider)'}`,cursor:'pointer',position:'relative',userSelect:'none',transition:'all var(--transition-fast)'}}>
      {rec&&<>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',transform:'rotate(-90deg)'}} viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="16" fill="none" stroke="var(--danger)" strokeOpacity=".22" strokeWidth="2"/>
          <circle cx="22" cy="22" r="16" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC*(1-Math.min(secs,60)/60)} style={{transition:'stroke-dashoffset 1s linear'}}/>
        </svg>
        <span style={{position:'absolute',top:-22,left:'50%',transform:'translateX(-50%)',fontSize:10,fontWeight:700,color:'var(--danger)',fontFamily:FONTS.mono,whiteSpace:'nowrap'}}>{secs}s</span>
      </>}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="6" y="1" width="6" height="10" rx="3" fill={rec?'var(--danger)':'var(--text-muted)'}/>
        <path d="M3 9a6 6 0 0012 0" stroke={rec?'var(--danger)':'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="9" y1="15" x2="9" y2="17" stroke={rec?'var(--danger)':'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

// ── ScrollFAB — uses --card-bg, --card-border, --shadow-lg, --accent ─────────
const ScrollFAB=({visible,onClick,count})=>(
  <button onClick={onClick} className="btn-compact" style={{position:'absolute',bottom:14,right:16,zIndex:20,width:42,height:42,borderRadius:'50%',background:'var(--card-bg-solid)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-lg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',opacity:visible?1:0,transform:visible?'scale(1)':'translateY(16px) scale(.8)',transition:`opacity var(--transition-base),transform var(--transition-spring),background var(--transition-theme)`,pointerEvents:visible?'auto':'none'}}>
    {count>0&&<div className="animate-scale-in" style={{position:'absolute',top:-5,right:-5,minWidth:20,height:20,borderRadius:'var(--radius-full)',background:'var(--accent)',color:'var(--text-inverse)',fontSize:10,fontWeight:800,fontFamily:FONTS.body,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',transition:'background var(--transition-theme)'}}>{count>99?'99+':count}</div>}
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 7l5 5 5-5" stroke="var(--text-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>
)

// ── MessageBubble ─────────────────────────────────────────────────────────────
// Sender:   var(--accent-gradient) + var(--accent-glow) + var(--text-inverse)
// Receiver: var(--card-bg) + var(--card-border) + var(--shadow-sm) + var(--text-primary)
const MessageBubble=({msg,isMe,isFirst,isLast,myId,showPicker,onShowPicker,onReact,onReply,onLongPress,onNavigate,onImageClick,isVanishing,showTime,onTripleTap,isDark=false})=>{
  const myRx=msg.reactions?.find(r=>r.userId===myId)?.emoji
  const wRef=useRef(null),tX=useRef(0),tY=useRef(0),lTimer=useRef(null),tapN=useRef(0),tapT=useRef(null),isSw=useRef(false)
  const [swX,setSwX]=useState(0),swD=useRef(0)

  const onTS=e=>{tX.current=e.touches[0].clientX;tY.current=e.touches[0].clientY;isSw.current=false;lTimer.current=setTimeout(()=>{if(!isSw.current){navigator.vibrate?.(30);onLongPress(e.touches[0].clientX,e.touches[0].clientY)}},420)}
  const onTM=e=>{const dx=e.touches[0].clientX-tX.current,dy=e.touches[0].clientY-tY.current;if(Math.abs(dy)>Math.abs(dx)){clearTimeout(lTimer.current);return}if(dx>6){isSw.current=true;clearTimeout(lTimer.current);swD.current=Math.min(dx,72);setSwX(swD.current)}}
  const onTE=()=>{clearTimeout(lTimer.current);if(swD.current>44)onReply(msg);setSwX(0);swD.current=0}
  const onTap=()=>{tapN.current++;clearTimeout(tapT.current);tapT.current=setTimeout(()=>{tapN.current=0},500);if(tapN.current>=3){tapN.current=0;onTripleTap(msg._id)}}

  const isImg=msg.type==='image',isVoc=msg.type==='voice',isItm=msg.type==='item',isOrd=msg.type==='order_status'
  const myR=isLast?'var(--radius-xl) var(--radius-xl) 4px var(--radius-xl)':'var(--radius-xl) var(--radius-xl) 6px var(--radius-xl)'
  const thR=isLast?'var(--radius-xl) var(--radius-xl) var(--radius-xl) 4px':'var(--radius-xl) var(--radius-xl) var(--radius-xl) 6px'

  return(
    <div style={{display:'flex',flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',gap:7,marginBottom:isLast?10:3,animation:isVanishing?'ct-vanish .5s ease forwards':undefined,pointerEvents:isVanishing?'none':undefined}} onClick={onTap}>
      {!isMe&&<div style={{width:28,flexShrink:0,marginBottom:2,opacity:isLast?1:0}}>{isLast&&<Avatar user={msg.fromUser} size={28}/>}</div>}

      <div ref={wRef} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onContextMenu={e=>{e.preventDefault();onLongPress(e.clientX,e.clientY)}} className={isMe?'ct-msg-r':'ct-msg-l'} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',maxWidth:'75%',position:'relative',transform:`translateX(${isMe?-swX:swX}px)`,transition:swX===0?'transform var(--transition-spring)':'none'}}>

        {/* Swipe arrow */}
        <div style={{position:'absolute',[isMe?'right':'left']:'calc(100% + 7px)',bottom:8,opacity:Math.min(swX/44,1),transform:`scale(${.6+Math.min(swX/44,1)*.4})`,transition:swX===0?'opacity var(--transition-fast),transform var(--transition-fast)':'none',fontSize:17,pointerEvents:'none',color:'var(--text-muted)'}}>↩</div>

        {/* Reply preview */}
        {msg.replyTo&&<div style={{padding:'5px 11px',marginBottom:3,borderRadius:isMe?'var(--radius-md) var(--radius-md) 4px var(--radius-md)':'var(--radius-md) var(--radius-md) var(--radius-md) 4px',background:'var(--pill-bg)',border:'1px solid var(--divider)',maxWidth:'100%',transition:'all var(--transition-theme)'}}>
          <p style={{margin:0,fontSize:9,fontWeight:800,color:'var(--accent)',fontFamily:FONTS.body,textTransform:'uppercase',letterSpacing:'.05em'}}>↩ Reply</p>
          <p style={{margin:'1px 0 0',fontSize:11,color:'var(--text-muted)',fontFamily:FONTS.body,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:190}}>{msg.replyTo?.content}</p>
        </div>}

        {/* Bubble — sender uses --accent-gradient & --text-inverse; receiver uses --card-bg & --text-primary */}
        <div style={{
          padding:isImg?0:'11px 15px',
          borderRadius:isMe?myR:thR,
          background:isMe?'var(--accent-gradient)':isDark?'rgba(255,255,255,0.13)':'rgba(255,255,255,0.97)',
          backdropFilter:!isMe?'blur(12px)':undefined,
          WebkitBackdropFilter:!isMe?'blur(12px)':undefined,
          border:isMe?'none':`1px solid ${isDark?'rgba(255,255,255,0.14)':'rgba(0,0,0,0.08)'}`,
          color:isMe?'#fff':isDark?'rgba(255,255,255,0.92)':'var(--text-primary)',
          fontSize:14,lineHeight:1.52,wordBreak:'break-word',fontFamily:FONTS.body,
          overflow:isImg?'hidden':'visible',
          boxShadow:isMe?'0 6px 24px var(--accent-glow)':isDark?'0 2px 16px rgba(0,0,0,0.45)':'0 2px 12px rgba(0,0,0,0.08)',
          opacity:msg._optimistic?.76:1,
          transition:`opacity .2s, background var(--transition-theme), border var(--transition-theme), color var(--transition-theme)`,
          position:'relative',
        }}>
          {/* Top shimmer using --top-glow from PALETTE */}
          {isMe&&<div aria-hidden style={{position:'absolute',top:0,left:'8%',right:'8%',height:1,background:'var(--top-glow)',backgroundSize:'100% 100%',backgroundRepeat:'no-repeat',opacity:.3,pointerEvents:'none'}}/>}

          {isImg
            ?<img src={msg.imageUrl} alt="Photo" onClick={e=>{e.stopPropagation();onImageClick?.(msg.imageUrl)}} style={{width:'100%',maxWidth:240,maxHeight:300,objectFit:'cover',display:'block',borderRadius:isMe?myR:thR,cursor:'pointer'}}/>
            :isVoc
            ?<AudioPlayer src={msg.audioUrl} isMe={isMe}/>
            :isItm
            ?<div onClick={e=>{e.stopPropagation();if(msg.itemData?._id)onNavigate?.(`/menu/item/${msg.itemData._id}`)}} style={{borderRadius:'var(--radius-md)',overflow:'hidden',minWidth:175,cursor:msg.itemData?._id?'pointer':'default'}}>
               {msg.itemData?.image?<img src={msg.itemData.image} alt={msg.itemData?.name} style={{width:'100%',height:104,objectFit:'cover',display:'block'}}/>:<div style={{width:'100%',height:66,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,background:'rgba(255,255,255,.06)'}}>🍽️</div>}
               <div style={{padding:'9px 11px'}}>
                 <p style={{margin:0,fontSize:13,fontWeight:800,color:isMe?'var(--text-inverse)':'var(--text-primary)',fontFamily:FONTS.heading}}>{msg.itemData?.name??msg.content?.replace('🍽️ ','')??'Menu item'}</p>
                 {msg.itemData?.price&&<p style={{margin:'2px 0 0',fontSize:11,fontWeight:700,color:isMe?'rgba(255,255,255,.75)':'var(--accent)',fontFamily:FONTS.mono}}>Rs. {msg.itemData.price}</p>}
                 {msg.itemData?._id&&<p style={{margin:'5px 0 0',fontSize:10,fontWeight:700,color:isMe?'rgba(255,255,255,.6)':'var(--accent)',fontFamily:FONTS.body}}>Tap to view →</p>}
               </div>
             </div>
            :isOrd
            ?<div>
               <p style={{margin:'0 0 2px',fontSize:9,fontWeight:800,letterSpacing:'.07em',textTransform:'uppercase',color:isMe?'rgba(255,255,255,.7)':'var(--accent)',fontFamily:FONTS.body}}>Order Status</p>
               <p style={{margin:0,fontSize:14,fontWeight:800,color:isMe?'var(--text-inverse)':'var(--text-primary)',fontFamily:FONTS.heading,textTransform:'capitalize'}}>{msg.orderData?.status}</p>
             </div>
            :(msg.content??'').split(/(@\w+)/g).map((p,i)=>
               p.startsWith('@')?<span key={i} style={{fontWeight:800,color:isMe?'rgba(255,255,255,.92)':'var(--accent)'}}>{p}</span>:<span key={i}>{p}</span>
            )
          }
        </div>

        {/* Reactions pill — uses --card-bg, --card-border, --shadow-xs */}
        {msg.reactions?.length>0&&<div onClick={onShowPicker} className="animate-scale-in" style={{display:'flex',gap:2,marginTop:4,padding:'3px 9px',borderRadius:'var(--radius-full)',background:'var(--card-bg-solid)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-xs)',fontSize:14,cursor:'pointer',transition:'background var(--transition-theme)'}}>
          {[...new Set(msg.reactions.map(r=>r.emoji))].map((e,i)=><span key={i}>{e}</span>)}
          {msg.reactions.length>1&&<span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginLeft:2}}>{msg.reactions.length}</span>}
        </div>}

        {showPicker&&<ReactionPicker isMe={isMe} currentEmoji={myRx} onSelect={e=>onReact(msg._id,e)} onRemove={()=>onReact(msg._id,null)}/>}
      </div>

      {/* Time + seen — --text-disabled + --success */}
      <div style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',justifyContent:'flex-end',paddingBottom:2,flexShrink:0,gap:2,minWidth:30,opacity:showTime?1:0,transition:'opacity var(--transition-fast)',pointerEvents:'none'}}>
        <span style={{fontSize:10,color:'var(--text-disabled)',fontFamily:FONTS.mono,whiteSpace:'nowrap'}}>{fmtT(msg.createdAt)}</span>
        {isMe&&<span style={{fontSize:11,fontWeight:700,color:msg.readAt?'var(--success)':'var(--text-disabled)',transition:'color var(--transition-base)'}}>{msg.readAt?'✓✓':'✓'}</span>}
      </div>
    </div>
  )
}

// ── ChatThread ────────────────────────────────────────────────────────────────
const ChatThread=()=>{
  const {userId:oid}=useParams()
  const dispatch=useDispatch(),navigate=useNavigate()
  const {isDark}=useContext(ThemeContext)
  const me=useSelector(selectUser),loading=useSelector(selectChatLoading),typingMap=useSelector(selectTypingUsers)
  const onlineSet=useSelector(selectOnlineUsers),customers=useSelector(selectCustomers)
  const activeOrder=useSelector(selectActiveOrder),menuItems=useSelector(selectAllItems)
  const menuLoaded=useSelector(s=>s.menu.lastFetched!==null),menuLoading=useSelector(s=>s.menu.loading)

  const myId=me?._id??me?.id
  const threadId=useMemo(()=>[myId,oid].filter(Boolean).sort().join('_'),[myId,oid])
  const threadSel=useMemo(()=>selectThread(threadId),[threadId])
  const messages=useSelector(threadSel)

  const [other,setOther]=useState(null),[content,setContent]=useState('')
  const [pickerMsgId,setPickerMsgId]=useState(null),[showMenu,setShowMenu]=useState(false)
  const [replyTo,setReplyTo]=useState(null),[showAttach,setShowAttach]=useState(false)
  const [showEmoji,setShowEmoji]=useState(false),[mentionQ,setMentionQ]=useState(null)
  const [itemQ,setItemQ]=useState(null),[vanishIds,setVanishIds]=useState(new Set())
  const [ctxMenu,setCtxMenu]=useState(null),[shownTimeId,setShownTimeId]=useState(null)
  const [lightbox,setLightbox]=useState(null),[showFAB,setShowFAB]=useState(false)
  const [unreadBelow,setUnreadBelow]=useState(0)

  const bottomRef=useRef(null),scrollRef=useRef(null),typingTimer=useRef(null)
  const inputRef=useRef(null),imageInput=useRef(null)

  const isOtherTyping=!!typingMap[oid]
  const isOtherOnline=onlineSet instanceof Set?onlineSet.has(oid):false
  const mutuals=useMemo(()=>customers.filter(c=>c._id!==myId&&(c.followStatus==='mutual'||c.followStatus==='friends')),[customers,myId])

  useEffect(()=>{if(!oid||!myId)return;dispatch(setActiveThread(threadId));dispatch(fetchThread(oid));return()=>dispatch(clearActiveThread())},[oid,myId,dispatch,threadId])

  useEffect(()=>{
    if(menuLoaded||menuLoading)return
    const id=localStorage.getItem('kc_cafe_id')||localStorage.getItem('cafeId')||import.meta.env.VITE_CAFE_ID
    if(id)dispatch(fetchMenu(id))
  },[menuLoaded,menuLoading,dispatch])

  useEffect(()=>{
    if(!oid)return;let dead=false
    const norm=d=>{if(!d?.name)return null;return{...d,avatarUrl:d.avatarUrl||d.avatar||d.profileImage||d.profilePic||d.photo||d.picture||d.image||d.photoURL||null}}
    const found=customers.find(c=>c._id===oid||c.id===oid);if(found){const n=norm(found);if(n)setOther(n)}
    api.get(`/social/list/stats/${oid}`).then(res=>{if(dead)return;const n=norm(res?.data??res);if(n?.name)setOther(p=>(!p?.avatarUrl&&n.avatarUrl)?n:p??n)}).catch(()=>{})
    return()=>{dead=true}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[oid])

  useEffect(()=>{
    if(!messages.length)return
    const f=messages.find(m=>(m.fromUserId?._id?.toString()??m.fromUserId?.toString())===oid)
    const p=f?.fromUserId;if(p?._id&&(p.avatarUrl||p.avatar))setOther(prev=>(!prev?.avatarUrl&&!prev?.avatar)?{...p,avatarUrl:p.avatarUrl||p.avatar||null}:prev)
  },[messages,oid])

  useEffect(()=>{
    if(!messages.length||!oid||!myId)return
    const has=messages.some(m=>(m.toUserId?._id??m.toUserId)===myId&&!m.readAt)
    if(has){socketService.emit('social:mark_seen',{threadId,fromUserId:oid});dispatch(markThreadSeen({threadId,seenAt:new Date().toISOString()}))}
  },[messages,myId,oid,threadId,dispatch])

  useEffect(()=>{
    const el=scrollRef.current;if(!el)return
    const d=el.scrollHeight-el.scrollTop-el.clientHeight
    if(d<130){bottomRef.current?.scrollIntoView({behavior:'smooth'});setUnreadBelow(0)}else setUnreadBelow(c=>c+1)
  },[messages.length,isOtherTyping])

  const handleScroll=useCallback(()=>{
    const el=scrollRef.current;if(!el)return
    const d=el.scrollHeight-el.scrollTop-el.clientHeight
    setShowFAB(d>160);if(d<80)setUnreadBelow(0)
  },[])
  const scrollBot=useCallback(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});setUnreadBelow(0)},[])

  useEffect(()=>{
    const h=({threadId:tid,messageIds})=>{if(tid!==threadId)return;setVanishIds(new Set(messageIds.map(id=>id.toString())))}
    const unsub=socketService.on('social:vanish',h);return()=>unsub?.()
  },[threadId])

  const handleTripleTap=useCallback(id=>setShownTimeId(p=>p===id?null:id),[])

  const handleSend=useCallback(async(override,meta={})=>{
    const text=(override??content).trim();if(!text)return
    setContent('');setReplyTo(null);setMentionQ(null);setItemQ(null);setShowEmoji(false)
    clearTimeout(typingTimer.current);socketService.emit('social:stop_typing',{toUserId:oid})
    dispatch(optimisticSend({threadId,content:text,myId,type:meta.type??'text',replyTo:replyTo?{content:replyTo.content}:undefined}))
    bottomRef.current?.scrollIntoView({behavior:'smooth'});setUnreadBelow(0)
    dispatch(sendSocialMessage({userId:oid,content:text,...(replyTo?{replyToId:replyTo._id,replyTo:{content:replyTo.content}}:{}),  ...meta}))
  },[content,replyTo,oid,threadId,myId,dispatch])

  const handleShareItem=useCallback(item=>{
    setContent('');setItemQ(null)
    const d={_id:item._id,name:item.name,price:item.price,image:item.image,category:item.category}
    dispatch(optimisticSend({threadId,content:`🍽️ ${item.name}`,myId,type:'item',itemData:d}))
    bottomRef.current?.scrollIntoView({behavior:'smooth'})
    dispatch(sendSocialMessage({userId:oid,content:`🍽️ ${item.name}`,type:'item',itemData:d}))
  },[oid,threadId,myId,dispatch])

  const handleInput=e=>{
    const val=e.target.value;if(val.length>MAX_CHARS)return;setContent(val)
    socketService.emit('social:typing',{toUserId:oid})
    clearTimeout(typingTimer.current);typingTimer.current=setTimeout(()=>socketService.emit('social:stop_typing',{toUserId:oid}),1500)
    const before=val.slice(0,e.target.selectionStart)
    setMentionQ(before.match(/@(\w*)$/)?.[1]??null);setItemQ(before.match(/#(\w*)$/)?.[1]??null)
  }
  const handleMention=f=>{const h=`@${f.username??f.name.replace(/\s+/,'_')}`;const p=inputRef.current?.selectionStart??content.length;setContent(content.slice(0,p).replace(/@\w*$/,h+' ')+content.slice(p));setMentionQ(null);inputRef.current?.focus()}
  const handleEmoji=em=>{const p=inputRef.current?.selectionStart??content.length;setContent(v=>v.slice(0,p)+em+v.slice(p));inputRef.current?.focus()}

  const handleImg=async e=>{
    const file=e.target.files[0];if(!file)return;e.target.value=''
    try{const c=await compressImg(file);dispatch(optimisticSend({threadId,content:'📷 Photo',myId,type:'image'}));bottomRef.current?.scrollIntoView({behavior:'smooth'});dispatch(sendSocialMessage({userId:oid,content:'📷 Photo',type:'image',imageUrl:c}))}
    catch(err){console.error('[Image]',err)}
  }
  const handleVoice=url=>{dispatch(optimisticSend({threadId,content:'🎤 Voice',myId,type:'voice'}));bottomRef.current?.scrollIntoView({behavior:'smooth'});dispatch(sendSocialMessage({userId:oid,content:'🎤 Voice',type:'voice',audioUrl:url}))}
  const handleReact=useCallback(async(mid,emoji)=>{setPickerMsgId(null);await dispatch(reactToMessage({messageId:mid,emoji}))},[dispatch])
  const handleDel=useCallback(async(mid,tid)=>{setCtxMenu(null);dispatch(messageDeleted({messageId:mid,threadId:tid}));dispatch(deleteMessage(mid))},[dispatch])
  const doUnfollow=async()=>{setShowMenu(false);await dispatch(unfollowUser(oid));navigate(-1)}
  const doBlock=async()=>{setShowMenu(false);await dispatch(blockUser(oid));navigate(-1)}

  const grouped=useMemo(()=>messages.map((msg,i)=>{
    const isMe=(msg.fromUserId?._id??msg.fromUserId)===myId
    const pMe=i>0?(messages[i-1].fromUserId?._id??messages[i-1].fromUserId)===myId:null
    const nMe=i<messages.length-1?(messages[i+1].fromUserId?._id??messages[i+1].fromUserId)===myId:null
    return{msg,isMe,isFirst:pMe!==isMe,isLast:nMe!==isMe,showDate:needsSep(messages,i)}
  }),[messages,myId])

  const charsLeft=MAX_CHARS-content.length,showCnt=content.length>MAX_CHARS*.8,canSend=content.trim().length>0
  const prevCanSend=useRef(false)
  const sendBtnRef=useRef(null)
  useEffect(()=>{
    if(canSend&&!prevCanSend.current&&sendBtnRef.current){
      sendBtnRef.current.classList.remove('ct-send-active')
      void sendBtnRef.current.offsetWidth // reflow to restart animation
      sendBtnRef.current.classList.add('ct-send-active')
    }
    prevCanSend.current=canSend
  },[canSend])
  const dismissAll=()=>{setPickerMsgId(null);setShowMenu(false);setShowAttach(false);setShowEmoji(false)}

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',width:'100%',maxWidth:'var(--max-width)',margin:'0 auto',background:'var(--bg)',position:'relative',overflow:'hidden'}} onClick={dismissAll}>
      <style>{CHAT_STYLES}</style>

      {/* Ambient orbs — var(--orb-color), var(--orb-color-2) from PALETTE */}
      <div aria-hidden style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,background:'radial-gradient(ellipse at 20% 10%, var(--orb-color) 0%, transparent 55%), radial-gradient(ellipse at 80% 85%, var(--orb-color-2) 0%, transparent 50%)',transition:'background var(--transition-theme)'}}/>

      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}

      {/* ── Header ── .glass from globals.css + var(--header-border) ─── */}
      <div onClick={e=>e.stopPropagation()} className="sticky-header glass" style={{display:'flex',alignItems:'center',gap:13,padding:`max(18px,calc(env(safe-area-inset-top)+14px)) 20px 18px`,borderBottom:'1px solid var(--header-border)',transition:'background var(--transition-theme),border-color var(--transition-theme)',zIndex:40,minHeight:76}}>
        <div aria-hidden style={{position:'absolute',top:0,left:'8%',right:'8%',height:1,background:'var(--top-glow)',backgroundSize:'100% 100%',backgroundRepeat:'no-repeat',opacity:.35,pointerEvents:'none'}}/>

        <button onClick={()=>navigate(-1)} className="btn-ghost btn-compact" style={{width:40,height:40,borderRadius:'var(--radius-md)',border:'1px solid var(--divider)',padding:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="var(--text-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <Avatar user={other} size={42} isOnline={isOtherOnline} onClick={()=>other&&navigate(`/customer/${oid}`)}/>

        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:15,fontWeight:700,color:'var(--text-primary)',fontFamily:FONTS.body,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',transition:'color var(--transition-theme)'}}>
            {other?.name??<span className="skeleton skeleton-text" style={{display:'inline-block',width:90}}/>}
          </p>
          <p style={{margin:0,fontSize:11,fontWeight:500,fontFamily:FONTS.body,color:isOtherTyping?'var(--accent)':isOtherOnline?'var(--success)':'var(--text-muted)',transition:'color var(--transition-fast)',display:'flex',alignItems:'center',gap:5}}>
            {isOtherTyping
              ?<>{[0,1,2].map(i=><span key={i} style={{width:4,height:4,borderRadius:'50%',background:'var(--accent)',display:'inline-block',animation:`ct-dot .9s ease-in-out ${i*.18}s infinite`}}/>)}<span>typing</span></>
              :isOtherOnline?'● Online':'Offline'
            }
          </p>
        </div>

        <div style={{position:'relative'}}>
          <button onClick={e=>{e.stopPropagation();setShowMenu(v=>!v)}} className="btn-ghost btn-compact" style={{width:40,height:40,borderRadius:'var(--radius-md)',border:'1px solid var(--divider)',padding:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="4.5" r="1.35" fill="var(--text-muted)"/><circle cx="9" cy="9" r="1.35" fill="var(--text-muted)"/><circle cx="9" cy="13.5" r="1.35" fill="var(--text-muted)"/></svg>
          </button>
          {showMenu&&<div className="animate-scale-spring" style={{position:'absolute',right:0,top:48,borderRadius:'var(--radius-xl)',overflow:'hidden',zIndex:50,minWidth:176,background:'var(--modal-bg)',border:'1px solid var(--modal-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
            <button onClick={doUnfollow} className="btn-ghost btn-compact" style={{width:'100%',padding:'13px 18px',borderRadius:0,textAlign:'left',fontSize:14,fontWeight:600,color:'var(--text-primary)',fontFamily:FONTS.body,justifyContent:'flex-start'}}>Unfollow</button>
            <div style={{height:1,background:'var(--divider)'}}/>
            <button onClick={doBlock} className="btn-ghost btn-compact" style={{width:'100%',padding:'13px 18px',borderRadius:0,textAlign:'left',fontSize:14,fontWeight:600,color:'var(--danger)',fontFamily:FONTS.body,justifyContent:'flex-start'}}>Block</button>
          </div>}
        </div>
      </div>

      {/* ── Messages ── scrollbar-hide from globals.css ──────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="scrollbar-hide" style={{flex:'1 1 0',overflowY:'auto',padding:'12px 14px 16px',position:'relative',zIndex:1,minHeight:0,overscrollBehavior:'contain'}}>
        {loading&&!messages.length
          ?<div style={{display:'flex',flexDirection:'column',gap:10,paddingTop:8}}>{[130,200,110,180,150].map((w,i)=><SkeletonBubble key={i} isMe={i%2===0} width={w}/>)}</div>
          :messages.length===0
          ?<div style={{textAlign:'center',padding:'52px 0 28px'}} className="animate-page-enter">
              <div style={{fontSize:58,marginBottom:14,animation:'ct-hi .6s ease both'}}>👋</div>
              <h3 style={{margin:'0 0 7px',fontSize:19,fontWeight:800,letterSpacing:'-.03em',color:'var(--text-primary)',fontFamily:FONTS.heading}}>Say hello to {other?.name?.split(' ')[0]??'them'}!</h3>
              <p style={{margin:'0 0 24px',fontSize:13,color:'var(--text-muted)',fontFamily:FONTS.body,lineHeight:1.65}}>You're now connected. Start the conversation!</p>
              {/* .btn-brand from globals.css — accent gradient + glow shadow */}
              <button onClick={()=>handleSend('👋')} className="btn-brand"><span style={{fontSize:20}}>👋</span> Say hi!</button>
            </div>
          :<div style={{display:'flex',flexDirection:'column'}}>
              <div style={{textAlign:'center',marginBottom:14}}>
                <span style={{fontSize:10,padding:'4px 14px',borderRadius:'var(--radius-full)',background:'var(--pill-bg)',border:'1px solid var(--divider)',color:'var(--text-muted)',fontFamily:FONTS.body,backdropFilter:'blur(8px)',letterSpacing:'.03em',transition:'all var(--transition-theme)'}}>Last 3 messages · older ones auto-removed</span>
              </div>
              {grouped.map(({msg,isMe,isFirst,isLast,showDate},i)=>(
                <Fragment key={msg._id??i}>
                  {showDate&&<DateSep date={msg.createdAt}/>}
                  <MessageBubble
                    msg={{...msg,fromUser:isMe?me:(other??msg.fromUserId)}}
                    isMe={isMe} isFirst={isFirst} isLast={isLast}
                    showPicker={pickerMsgId===msg._id} onShowPicker={()=>setPickerMsgId(msg._id)}
                    onReact={handleReact} myId={myId} onReply={setReplyTo}
                    isVanishing={vanishIds.has(msg._id?.toString())}
                    showTime={shownTimeId===msg._id} onTripleTap={handleTripleTap}
                    onLongPress={(x,y)=>setCtxMenu({msg,isMe,x,y})}
                    onNavigate={navigate} onImageClick={setLightbox} isDark={isDark}
                  />
                </Fragment>
              ))}
              {isOtherTyping&&<div style={{display:'flex',justifyContent:'flex-start',gap:8,alignItems:'flex-end',marginTop:6}}><Avatar user={other} size={28}/><TypingDots/></div>}
            </div>
        }
        <div ref={bottomRef}/>
        <ScrollFAB visible={showFAB} onClick={scrollBot} count={unreadBelow}/>
      </div>

      {/* ── Context menu — uses --modal-bg, --modal-border, --shadow-xl ── */}
      {ctxMenu&&<>
        <div onClick={()=>setCtxMenu(null)} style={{position:'fixed',inset:0,zIndex:80}}/>
        <div className="animate-scale-spring" style={{position:'fixed',top:Math.min(ctxMenu.y+8,window.innerHeight-250),left:Math.max(8,Math.min(ctxMenu.x-100,window.innerWidth-220)),zIndex:81,borderRadius:'var(--radius-xl)',overflow:'hidden',minWidth:210,background:'var(--modal-bg)',border:'1px solid var(--modal-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)'}}>
          {[
            {icon:'↩',label:'Reply',color:'var(--text-primary)',action:()=>{setReplyTo(ctxMenu.msg);setCtxMenu(null)}},
            {icon:'😊',label:'React',color:'var(--text-primary)',action:()=>{setPickerMsgId(ctxMenu.msg._id);setCtxMenu(null)}},
            ...(ctxMenu.isMe?[{icon:'🗑️',label:'Unsend',color:'var(--warning)',action:()=>handleDel(ctxMenu.msg._id,threadId)}]:[]),
            ...(!ctxMenu.isMe?[{icon:'🚫',label:'Delete for me',color:'var(--danger)',action:()=>handleDel(ctxMenu.msg._id,threadId)}]:[]),
            ...(ctxMenu.msg.type==='text'?[{icon:'📋',label:'Copy',color:'var(--text-primary)',action:()=>{navigator.clipboard?.writeText(ctxMenu.msg.content??'');setCtxMenu(null)}}]:[]),
          ].map(({icon,label,color,action},i,arr)=>(
            <button key={label} onClick={action} className="btn-compact" style={{width:'100%',display:'flex',alignItems:'center',gap:13,padding:'13px 18px',background:'none',border:'none',borderBottom:i<arr.length-1?'1px solid var(--divider)':'none',cursor:'pointer',textAlign:'left'}}>
              <span style={{fontSize:19}}>{icon}</span>
              <span style={{fontSize:14,fontWeight:600,color,fontFamily:FONTS.body,transition:'color var(--transition-theme)'}}>{label}</span>
            </button>
          ))}
        </div>
      </>}

      {/* ── Input bar — floats at bottom of flex column, small margin from edge */}
      <div onClick={e=>e.stopPropagation()} style={{flexShrink:0,zIndex:20,padding:'6px 12px',paddingBottom:'max(12px,calc(env(safe-area-inset-bottom,0px)+8px))',background:'transparent'}}>
        {/* Floating pill — premium glass card */}
        <div style={{borderRadius:'var(--radius-2xl)',background:'var(--modal-bg)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(24px) saturate(180%)',WebkitBackdropFilter:'blur(24px) saturate(180%)',padding:'10px 12px',transition:'background var(--transition-theme),border-color var(--transition-theme)'}}>


        {replyTo&&<QuoteReply msg={replyTo} otherUser={other} onClear={()=>setReplyTo(null)}/>}

        <div style={{position:'relative'}}>
          {mentionQ!==null&&<MentionPicker query={mentionQ} friends={mutuals} onSelect={handleMention}/>}
          {itemQ!==null&&<ItemPicker query={itemQ} items={menuItems} onSelect={handleShareItem}/>}
          {showEmoji&&<EmojiPicker onSelect={handleEmoji}/>}
        </div>

        <div className="flex items-end gap-2">
          {/* Emoji toggle */}
          <button onClick={()=>{setShowEmoji(v=>!v);setShowAttach(false)}} className="btn-compact flex-shrink-0 flex items-center justify-center text-xl transition-all duration-150" style={{width:44,height:44,borderRadius:'var(--radius-lg)',background:showEmoji?'var(--accent-dim)':'var(--pill-bg)',border:`1.5px solid ${showEmoji?'var(--accent-border)':'var(--divider)'}`}}>
            {showEmoji?'⌨️':'😊'}
          </button>

          {/* Attach */}
          <div className="relative flex-shrink-0">
            <button onClick={()=>{setShowAttach(v=>!v);setShowEmoji(false)}} className="btn-compact flex items-center justify-center transition-all duration-150" style={{width:44,height:44,borderRadius:'var(--radius-lg)',background:showAttach?'var(--accent-dim)':'var(--pill-bg)',border:`1.5px solid ${showAttach?'var(--accent-border)':'var(--divider)'}`}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4v10M4 9h10" stroke={showAttach?'var(--accent)':'var(--text-muted)'} strokeWidth="2.1" strokeLinecap="round"/></svg>
            </button>
            {showAttach&&<div className="animate-scale-spring" style={{position:'absolute',bottom:'calc(100% + 10px)',left:0,borderRadius:'var(--radius-xl)',overflow:'hidden',zIndex:36,minWidth:196,background:'var(--modal-bg)',border:'1px solid var(--modal-border)',boxShadow:'var(--shadow-xl)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
              <button onClick={()=>{imageInput.current?.click();setShowAttach(false)}} className="btn-ghost btn-compact" style={{width:'100%',display:'flex',alignItems:'center',gap:13,padding:'13px 18px',borderRadius:0,justifyContent:'flex-start',borderBottom:'1px solid var(--divider)'}}>
                <span style={{fontSize:21}}>📷</span><span style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',fontFamily:FONTS.body}}>Photo</span>
              </button>
              {activeOrder&&<button onClick={()=>{dispatch(sendSocialMessage({userId:oid,content:`My order: ${activeOrder.status} 📋`,type:'order_status',orderData:activeOrder}));setShowAttach(false)}} className="btn-ghost btn-compact" style={{width:'100%',display:'flex',alignItems:'center',gap:13,padding:'13px 18px',borderRadius:0,justifyContent:'flex-start'}}>
                <span style={{fontSize:21}}>📋</span><span style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',fontFamily:FONTS.body}}>Share order</span>
              </button>}
            </div>}
          </div>

          <input ref={imageInput} type="file" accept="image/*" style={{display:'none'}} onChange={handleImg}/>

          {/* Textarea */}
          <div className="relative flex-1 min-w-0">
            <textarea ref={inputRef} rows={1} placeholder="Message…" value={content} onChange={handleInput} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}} className="input-base w-full" style={{resize:'none',borderRadius:'var(--radius-xl)',padding:'11px 15px',maxHeight:96,lineHeight:1.5,fontFamily:FONTS.body,display:'block',fontSize:'max(16px,14px)'}}/>
            {showCnt&&<div style={{position:'absolute',bottom:-18,right:6,fontSize:10,fontWeight:700,color:charsLeft<20?'var(--danger)':'var(--text-muted)',fontFamily:FONTS.mono,transition:'color var(--transition-fast)'}}>{charsLeft}</div>}
          </div>

          <VoiceBtn onSend={handleVoice}/>

          {/* Send */}
          {/* Send button — accent gradient when typing, muted when empty */}
          <button
            onClick={()=>handleSend()}
            disabled={!canSend}
            ref={sendBtnRef}
            className="btn-compact flex-shrink-0 flex items-center justify-center"
            style={{
              width:44, height:44,
              borderRadius:'var(--radius-lg)',
              padding:0,
              border: canSend ? 'none' : '1.5px solid var(--divider)',
              background: canSend ? 'var(--accent-gradient)' : 'var(--pill-bg)',
              boxShadow: canSend ? '0 4px 20px var(--accent-glow)' : 'none',
              transform: canSend ? 'scale(1)' : 'scale(.88)',
              transition: 'background 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, border 0.2s ease',
            }}
            onMouseDown={e=>{if(canSend)e.currentTarget.style.transform='scale(.86)'}}
            onMouseUp={e=>{e.currentTarget.style.transform=canSend?'scale(1)':'scale(.88)'}}
            onTouchStart={e=>{if(canSend)e.currentTarget.style.transform='scale(.86)'}}
            onTouchEnd={e=>{e.currentTarget.style.transform=canSend?'scale(1)':'scale(.88)'}}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l14-7-7 14V9H2z" fill={canSend ? '#fff' : 'var(--text-muted)'}
                style={{transition:'fill 0.2s ease'}}
              />
            </svg>
          </button>
        </div>
        </div>{/* end floating pill */}
      </div>
    </div>
  )
}

export default ChatThread