// src/modules/customer/components/menu/WelcomeCard.jsx
//
// ARCHITECTURE NOTE:
//   weather prop comes from useRecommendations().weather
//   which calls api.get('/weather/current?lat=...&lng=...')
//   api.interceptor returns response.data directly — no .data unwrap needed
//   DO NOT use useWeather / weather.service.js (frontend) — those are wrong
//
import { useRef, useEffect, useContext, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import gsap from "gsap";
import { Clock, Wifi, ShoppingBag } from "lucide-react";
import { ThemeContext } from "@shared/context/ThemeContext";
import { selectUser, selectIsGuest } from "@store/slices/authSlice";
import {
  selectTableNumber,
  selectSession,
} from "@store/slices/tableSessionSlice";
import { selectCartItems } from "@store/slices/cartSlice";

// ─── Font injection ────────────────────────────────────────────
const injectFonts = () => {
  if (document.getElementById("wc-fonts")) return;
  ["https://fonts.googleapis.com", "https://fonts.gstatic.com"].forEach(
    (href, i) => {
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      if (i === 1) l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    },
  );
  const link = document.createElement("link");
  link.id = "wc-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Keania+One&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,800;12..96,900&family=Syne:wght@700;800;900&display=swap";
  document.head.appendChild(link);
};

// ─── Greeting ──────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return { label: "Late Night",     sub: "Something special awaits" };
  if (h < 12) return { label: "Good Morning",   sub: "Start your day deliciously" };
  if (h < 17) return { label: "Good Afternoon", sub: "Time for a flavourful break" };
  if (h < 21) return { label: "Good Evening",   sub: "Dinner is served" };
  return       { label: "Good Night",    sub: "Late night cravings sorted" };
};

// ─── Tier config ───────────────────────────────────────────────
const TIER = {
  none:   { emoji: "☕", label: "New Member" },
  bronze: { emoji: "🥉", label: "Bronze"     },
  silver: { emoji: "🥈", label: "Silver"     },
  gold:   { emoji: "🥇", label: "Gold"       },
};

// ─── Weather themes ────────────────────────────────────────────
const WEATHER_THEME = {
  sunny: {
    light: { bg: ["#FF9A3C", "#FFCD3C", "#FFF0A0"], text: "#7A3B00", sub: "rgba(100,50,0,0.55)",   shadow: "rgba(255,160,30,0.45)"  },
    dark:  { bg: ["#7C2D00", "#B45309", "#D97706"], text: "#FFE4A0", sub: "rgba(255,220,150,0.55)", shadow: "rgba(200,100,0,0.55)"   },
  },
  hot: {
    light: { bg: ["#FF6B6B", "#FF8E53", "#FFCB77"], text: "#7A1515", sub: "rgba(120,30,20,0.5)",   shadow: "rgba(255,80,50,0.45)"   },
    dark:  { bg: ["#7F1D1D", "#9B2335", "#C0392B"], text: "#FFCDD2", sub: "rgba(255,180,180,0.5)", shadow: "rgba(180,30,30,0.55)"   },
  },
  rainy: {
    light: { bg: ["#A8CABA", "#5D9FBF", "#EBF4F5"], text: "#1A3A5C", sub: "rgba(20,60,100,0.5)",   shadow: "rgba(80,130,180,0.4)"   },
    dark:  { bg: ["#0D1B2A", "#1B3A5C", "#2C5F8A"], text: "#B0D4F1", sub: "rgba(150,200,240,0.5)", shadow: "rgba(30,80,150,0.55)"   },
  },
  cold: {
    light: { bg: ["#D4F1F9", "#89CFF0", "#BFEFFF"], text: "#0C3547", sub: "rgba(10,60,100,0.45)",  shadow: "rgba(80,180,230,0.4)"   },
    dark:  { bg: ["#0A1628", "#0D2E5C", "#1A4F8C"], text: "#C5E8FF", sub: "rgba(150,210,255,0.5)", shadow: "rgba(20,80,180,0.55)"   },
  },
  cloudy: {
    light: { bg: ["#D4D8E2", "#B8BFCC", "#E8ECF2"], text: "#2D3142", sub: "rgba(45,50,70,0.45)",   shadow: "rgba(100,110,140,0.3)"  },
    dark:  { bg: ["#1A1D2E", "#252A3D", "#2E3450"], text: "#C8CEDE", sub: "rgba(180,190,210,0.5)", shadow: "rgba(40,50,80,0.55)"    },
  },
  windy: {
    light: { bg: ["#C8E6FF", "#A0C4FF", "#D4F0FF"], text: "#1A3A6C", sub: "rgba(20,50,120,0.45)",  shadow: "rgba(80,150,220,0.35)"  },
    dark:  { bg: ["#0D1F3C", "#162D5A", "#1E3D7A"], text: "#B8D4FF", sub: "rgba(140,190,255,0.5)", shadow: "rgba(20,60,160,0.5)"    },
  },
  snowy: {
    light: { bg: ["#EEF2FF", "#DBEAFE", "#F0F9FF"], text: "#1E3A5F", sub: "rgba(20,50,100,0.4)",   shadow: "rgba(100,150,220,0.3)"  },
    dark:  { bg: ["#0F172A", "#1E2D4A", "#1A3060"], text: "#C0D8FF", sub: "rgba(160,200,255,0.5)", shadow: "rgba(30,70,160,0.5)"    },
  },
};

const W_META = {
  sunny: { icon: "☀️", label: "Sunny"  },
  hot:   { icon: "🌡️", label: "Hot"    },
  rainy: { icon: "🌧️", label: "Rainy"  },
  cold:  { icon: "🌨️", label: "Cold"   },
  cloudy:{ icon: "☁️",  label: "Cloudy" },
  windy: { icon: "💨", label: "Windy"  },
  snowy: { icon: "❄️",  label: "Snowy"  },
};

// ─── Weather canvas animations ─────────────────────────────────
const SunnyCanvas = ({ isDark }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    let raf, t = 0;
    const rays = Array.from({ length: 8 }, (_, i) => ({ angle: (i / 8) * Math.PI * 2, speed: 0.003 + i * 0.001 }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const cx = c.width * 0.82, cy = c.height * 0.18;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
      g.addColorStop(0, isDark ? "rgba(255,180,50,0.45)" : "rgba(255,220,80,0.65)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill();
      rays.forEach((r) => {
        const a = r.angle + t * r.speed;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        const rg = ctx.createLinearGradient(0, 0, 110, 0);
        rg.addColorStop(0, isDark ? "rgba(255,200,60,0.22)" : "rgba(255,240,100,0.28)");
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg; ctx.beginPath();
        ctx.moveTo(12, -3); ctx.lineTo(110, -9); ctx.lineTo(110, 9); ctx.lineTo(12, 3);
        ctx.fill(); ctx.restore();
      });
      t++; raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
};

const CloudyCanvas = ({ isDark }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    let raf;
    const drawCloud = (x, y, sc, al) => {
      ctx.save(); ctx.globalAlpha = al;
      [{ dx:0,dy:0,r:28 },{ dx:22,dy:-8,r:22 },{ dx:-22,dy:-5,r:20 },{ dx:42,dy:4,r:16 },{ dx:-40,dy:4,r:14 },{ dx:12,dy:-18,r:16 }]
        .forEach(({ dx, dy, r }) => {
          const gr = ctx.createRadialGradient(x+dx, y+dy-r*0.2*sc, 0, x+dx, y+dy, r*sc);
          const col = isDark ? "rgba(140,155,190,X)" : "rgba(255,255,255,X)";
          gr.addColorStop(0, col.replace("X","0.9")); gr.addColorStop(0.6, col.replace("X","0.6")); gr.addColorStop(1, "transparent");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x+dx, y+dy, r*sc, 0, Math.PI*2); ctx.fill();
        });
      ctx.restore();
    };
    const clouds = [{ x:c.width*0.6,y:40,sc:1.1,al:0.85,sp:0.18 },{ x:c.width*0.15,y:65,sc:0.75,al:0.55,sp:0.12 },{ x:c.width*0.88,y:28,sc:0.6,al:0.45,sp:0.22 },{ x:-40,y:80,sc:0.5,al:0.3,sp:0.08 }];
    const animate = () => { ctx.clearRect(0,0,c.width,c.height); clouds.forEach(cl => { drawCloud(cl.x,cl.y,cl.sc,cl.al); cl.x+=cl.sp; if(cl.x-80>c.width)cl.x=-80; }); raf=requestAnimationFrame(animate); };
    animate(); return () => cancelAnimationFrame(raf);
  }, [isDark]);
  return <canvas ref={ref} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }} />;
};

const RainyCanvas = ({ isDark }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); c.width=c.offsetWidth; c.height=c.offsetHeight;
    let raf;
    const drops = Array.from({length:55},()=>({ x:Math.random()*c.width, y:Math.random()*c.height, len:8+Math.random()*14, sp:7+Math.random()*8, al:0.15+Math.random()*0.35, th:0.8+Math.random()*0.8 }));
    const ripples=[]; let rt=0;
    const animate = () => {
      ctx.clearRect(0,0,c.width,c.height);
      drops.forEach(d=>{ ctx.save(); ctx.globalAlpha=d.al; ctx.strokeStyle=isDark?"rgba(180,210,255,1)":"rgba(100,160,220,1)"; ctx.lineWidth=d.th; ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-d.len*0.15,d.y+d.len); ctx.stroke(); ctx.restore(); d.y+=d.sp; d.x-=d.sp*0.15; if(d.y>c.height){d.y=-d.len;d.x=Math.random()*c.width;} });
      rt++; if(rt%14===0)ripples.push({x:Math.random()*c.width,y:c.height-8-Math.random()*14,r:0,al:0.5,sp:0.6});
      for(let i=ripples.length-1;i>=0;i--){ const rp=ripples[i]; ctx.save(); ctx.globalAlpha=rp.al; ctx.strokeStyle=isDark?"rgba(150,200,255,1)":"rgba(80,140,200,1)"; ctx.lineWidth=0.8; ctx.beginPath(); ctx.ellipse(rp.x,rp.y,rp.r,rp.r*0.35,0,0,Math.PI*2); ctx.stroke(); ctx.restore(); rp.r+=rp.sp; rp.al-=0.018; if(rp.al<=0)ripples.splice(i,1); }
      raf=requestAnimationFrame(animate);
    };
    animate(); return ()=>cancelAnimationFrame(raf);
  }, [isDark]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} />;
};

const SnowyCanvas = ({ isDark }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"); c.width=c.offsetWidth; c.height=c.offsetHeight; let raf;
    const flakes=Array.from({length:45},()=>({ x:Math.random()*c.width, y:Math.random()*c.height, r:1.5+Math.random()*3.5, sp:0.6+Math.random()*1.2, dr:(Math.random()-0.5)*0.4, al:0.4+Math.random()*0.5, wb:Math.random()*Math.PI*2, ws:0.02+Math.random()*0.02 }));
    const animate=()=>{ ctx.clearRect(0,0,c.width,c.height); flakes.forEach(f=>{ f.wb+=f.ws; const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r); g.addColorStop(0,isDark?"rgba(200,220,255,1)":"rgba(255,255,255,1)"); g.addColorStop(1,"transparent"); ctx.save(); ctx.globalAlpha=f.al; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill(); ctx.restore(); f.y+=f.sp; f.x+=f.dr+Math.sin(f.wb)*0.5; if(f.y>c.height+5){f.y=-5;f.x=Math.random()*c.width;} if(f.x<-5)f.x=c.width+5; if(f.x>c.width+5)f.x=-5; }); raf=requestAnimationFrame(animate); };
    animate(); return ()=>cancelAnimationFrame(raf);
  }, [isDark]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} />;
};

const WindyCanvas = ({ isDark }) => {
  const ref=useRef(null);
  useEffect(()=>{ const c=ref.current; if(!c) return; const ctx=c.getContext("2d"); c.width=c.offsetWidth; c.height=c.offsetHeight; let raf; const lines=Array.from({length:18},(_,i)=>({ y:10+(i/18)*c.height*0.85, x:-Math.random()*c.width, len:40+Math.random()*80, sp:3+Math.random()*4, al:0.08+Math.random()*0.22, th:0.6+Math.random()*1.2, cv:(Math.random()-0.5)*12 })); const animate=()=>{ ctx.clearRect(0,0,c.width,c.height); lines.forEach(l=>{ ctx.save(); ctx.globalAlpha=l.al; ctx.strokeStyle=isDark?"rgba(180,210,255,1)":"rgba(80,130,200,1)"; ctx.lineWidth=l.th; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.bezierCurveTo(l.x+l.len*0.33,l.y+l.cv,l.x+l.len*0.66,l.y-l.cv*0.5,l.x+l.len,l.y); ctx.stroke(); ctx.restore(); l.x+=l.sp; if(l.x>c.width+20){l.x=-l.len-20;l.y=10+Math.random()*c.height*0.85;} }); raf=requestAnimationFrame(animate); }; animate(); return ()=>cancelAnimationFrame(raf); },[isDark]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} />;
};

const HotCanvas = ({ isDark }) => {
  const ref=useRef(null);
  useEffect(()=>{ const c=ref.current; if(!c) return; const ctx=c.getContext("2d"); c.width=c.offsetWidth; c.height=c.offsetHeight; let raf,t=0; const embers=Array.from({length:20},()=>({ x:Math.random()*c.width, y:c.height*0.5+Math.random()*c.height*0.5, r:1+Math.random()*2.5, sp:0.5+Math.random()*1.2, dr:(Math.random()-0.5)*0.8, al:0.4+Math.random()*0.5 })); const animate=()=>{ ctx.clearRect(0,0,c.width,c.height); for(let i=0;i<4;i++){const wy=c.height*(0.3+i*0.18)+Math.sin(t*0.025+i)*10; const wg=ctx.createLinearGradient(0,wy-12,0,wy+12); wg.addColorStop(0,"transparent"); wg.addColorStop(0.5,isDark?"rgba(255,120,30,0.06)":"rgba(255,140,30,0.08)"); wg.addColorStop(1,"transparent"); ctx.fillStyle=wg; ctx.fillRect(0,wy-12,c.width,24);} embers.forEach(e=>{ctx.save();ctx.globalAlpha=e.al;const g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r*2);g.addColorStop(0,isDark?"rgba(255,200,50,1)":"rgba(255,160,30,1)");g.addColorStop(0.5,isDark?"rgba(255,100,20,0.6)":"rgba(255,80,0,0.5)");g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.x,e.y,e.r*2,0,Math.PI*2);ctx.fill();ctx.restore();e.y-=e.sp;e.x+=e.dr;e.al-=0.003;if(e.y<0||e.al<=0){e.x=Math.random()*c.width;e.y=c.height*0.7+Math.random()*c.height*0.3;e.al=0.4+Math.random()*0.5;}}); t++;raf=requestAnimationFrame(animate);}; animate(); return ()=>cancelAnimationFrame(raf); },[isDark]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} />;
};

const ColdCanvas = ({ isDark }) => {
  const ref=useRef(null);
  useEffect(()=>{ const c=ref.current; if(!c) return; const ctx=c.getContext("2d"); c.width=c.offsetWidth; c.height=c.offsetHeight; let raf; const drawBranch=(x,y,a,len,d)=>{ if(d===0||len<3)return; const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len; ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke(); if(d>1)[-Math.PI/4,Math.PI/4,-Math.PI/3,Math.PI/3].forEach(da=>drawBranch(ex,ey,a+da,len*0.55,d-1)); }; const pts=Array.from({length:25},()=>({ x:Math.random()*c.width, y:Math.random()*c.height, r:1+Math.random()*2, al:0.2+Math.random()*0.4, ph:Math.random()*Math.PI*2 })); const animate=()=>{ ctx.clearRect(0,0,c.width,c.height); [[0,0],[c.width,0]].forEach(([fx,fy],qi)=>{ ctx.save(); ctx.strokeStyle=isDark?"rgba(160,200,255,0.18)":"rgba(180,220,255,0.45)"; ctx.lineWidth=0.7; const ba=qi===0?[0.2,0.6,1.0]:[Math.PI-0.2,Math.PI-0.6,Math.PI-1.0]; ba.forEach(a=>drawBranch(fx,fy,a,35,3)); ctx.restore(); }); pts.forEach(p=>{ p.ph+=0.012; ctx.save(); ctx.globalAlpha=p.al; ctx.fillStyle=isDark?"rgba(180,220,255,1)":"rgba(100,170,230,1)"; ctx.beginPath(); ctx.arc(p.x,p.y+Math.sin(p.ph)*4,p.r,0,Math.PI*2); ctx.fill(); ctx.restore(); }); raf=requestAnimationFrame(animate); }; animate(); return ()=>cancelAnimationFrame(raf); },[isDark]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} />;
};

const WeatherCanvas = ({ condition, isDark }) => {
  switch (condition) {
    case "sunny":  return <SunnyCanvas  isDark={isDark} />;
    case "hot":    return <HotCanvas    isDark={isDark} />;
    case "rainy":  return <RainyCanvas  isDark={isDark} />;
    case "cold":   return <ColdCanvas   isDark={isDark} />;
    case "windy":  return <WindyCanvas  isDark={isDark} />;
    case "snowy":  return <SnowyCanvas  isDark={isDark} />;
    default:       return <CloudyCanvas isDark={isDark} />;
  }
};

// ─── Skeleton ──────────────────────────────────────────────────
const WelcomeCardSkeleton = ({ isDark: D }) => {
  const b = D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const m = D ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const s = { background:`linear-gradient(90deg,${b} 0%,${m} 50%,${b} 100%)`, backgroundSize:"200% 100%", animation:"wc-sk 1.6s ease-in-out infinite", borderRadius:8 };
  return (
    <>
      <style>{`@keyframes wc-sk{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      <div style={{ margin:16, borderRadius:24, minHeight:196, overflow:"hidden", background:D?"#1A1D2E":"#D4D8E2", padding:"20px 20px 18px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
            <div style={{...s,height:9,width:"38%"}} />
            <div style={{...s,height:9,width:"18%"}} />
            <div style={{...s,height:40,width:"65%",marginTop:4,borderRadius:10}} />
            <div style={{...s,height:9,width:"50%",marginTop:2}} />
          </div>
          <div style={{...s,height:82,width:72,borderRadius:18,flexShrink:0,marginLeft:12}} />
        </div>
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <div style={{...s,height:28,width:108,borderRadius:99}} />
          <div style={{...s,height:28,width:90,borderRadius:99}} />
        </div>
        <div style={{display:"flex",gap:14,marginTop:4}}>
          <div style={{...s,height:9,width:90,borderRadius:4}} />
          <div style={{...s,height:9,width:80,borderRadius:4}} />
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
//  Props:
//    weather  — { condition, temp, city } from useRecommendations
//    loading  — boolean, true while rec hook is fetching
// ─────────────────────────────────────────────────────────────────────────────
const WelcomeCard = ({ weather, loading = false }) => {
  useEffect(() => { injectFonts(); }, []);

  const { isDark }    = useContext(ThemeContext);
  const user          = useSelector(selectUser);
  const isGuest       = useSelector(selectIsGuest);
  const tableNumber   = useSelector(selectTableNumber);
  const session       = useSelector(selectSession);
  const cartItems     = useSelector(selectCartItems);

  const [tableVisible, setTableVisible] = useState(false);

  const cardRef    = useRef(null);
  const greetRef   = useRef(null);
  const prefixRef  = useRef(null);
  const nameRowRef = useRef(null);
  const subRef     = useRef(null);
  const pillsRef   = useRef(null);
  const stripRef   = useRef(null);
  const shimmerRef = useRef(null);
  const tableRef   = useRef(null);

  const condition = weather?.condition ?? "cloudy";
  const theme     = (WEATHER_THEME[condition] || WEATHER_THEME.cloudy)[isDark ? "dark" : "light"];
  const wMeta     = W_META[condition] || W_META.cloudy;
  const tc        = TIER[user?.loyaltyTier || "none"];

  const displayName = isGuest ? "Guest" : user?.name?.split(" ")[0] || "Friend";
  const cartCount   = cartItems?.reduce((a, i) => a + i.quantity, 0) ?? 0;
  const { label: greetLabel, sub: greetSub } = getGreeting();

  const sessionStart = session?.createdAt
    ? new Date(session.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  const bgGradient = useMemo(
    () => `linear-gradient(148deg, ${theme.bg[0]} 0%, ${theme.bg[1]} 55%, ${theme.bg[2]} 100%)`,
    [theme],
  );

  // ── Main entrance animation ───────────────────────────────
  useEffect(() => {
    if (!cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap.timeline({ delay: 0.05, defaults: { ease: "power3.out" } });
    tl.fromTo(cardRef.current,
      { y: 24, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, force3D: true, clearProps: "transform" },
    );
    const els = [greetRef, prefixRef, nameRowRef, subRef, pillsRef, stripRef].map(r => r.current).filter(Boolean);
    if (els.length) tl.fromTo(els, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, stagger: 0.06 }, "-=0.4");
    if (shimmerRef.current) tl.fromTo(shimmerRef.current, { x: "-115%" }, { x: "215%", duration: 1.6, ease: "power1.inOut" }, 0.22);
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);

  // ── Table badge delayed reveal ────────────────────────────
  useEffect(() => {
    if (!tableNumber) return;
    setTableVisible(false);
    const timer = setTimeout(() => setTableVisible(true), 500);
    return () => clearTimeout(timer);
  }, [tableNumber]);

  useEffect(() => {
    if (!tableVisible || !tableRef.current) return;
    gsap.fromTo(tableRef.current,
      { scale: 0.5, opacity: 0, y: 10, rotateZ: -8 },
      { scale: 1, opacity: 1, y: 0, rotateZ: 0, duration: 0.7, ease: "back.out(2.6)", force3D: true, clearProps: "transform" },
    );
  }, [tableVisible]);

  // ── Early return — all hooks above ───────────────────────
  if (loading && !weather) return <WelcomeCardSkeleton isDark={isDark} />;

  const D = isDark;

  // ── Name text-shadow: layered depth matching the weather palette ──
  const nameTextShadow = D
    ? `0 1px 0 rgba(0,0,0,0.5), 0 2px 12px ${theme.shadow}, 0 0 40px ${theme.shadow}`
    : `0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(255,255,255,0.3), 0 4px 20px ${theme.shadow}`;

  return (
    <>
      <style>{`
        .wc-root { font-family:'Plus Jakarta Sans',system-ui,sans-serif; -webkit-tap-highlight-color:transparent; }
        .wc-pill {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 13px; border-radius:99px;
          font-size:11.5px; font-weight:600;
          font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:0.01em;
          white-space:nowrap; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
          transition:background 0.3s,border-color 0.3s; flex-shrink:0;
        }
        .wc-strip-item {
          display:inline-flex; align-items:center; gap:4px;
          font-size:9.5px; font-weight:500;
          font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:0.02em;
          opacity:0.52; white-space:nowrap;
        }
        /* Table badge pulse ring */
        @keyframes wc-ring {
          0%   { transform:scale(1);    opacity:0.5  }
          70%  { transform:scale(1.6);  opacity:0    }
          100% { transform:scale(1.6);  opacity:0    }
        }
        .wc-badge-ring { animation: wc-ring 2.6s ease-out infinite; }
        /* Greeting label subtle pulse */
        @keyframes wc-glow { 0%,100%{opacity:0.45} 50%{opacity:0.75} }
        .wc-greet-label { animation: wc-glow 3s ease-in-out infinite; }
        /* Table number digit — tight tracking */
        .wc-table-num {
          font-family:'Bricolage Grotesque','Plus Jakarta Sans',system-ui,sans-serif;
          font-weight:900;
          letter-spacing:-0.03em;
          line-height:1;
        }
        /* ── Keania One name ── */
        .wc-name {
          font-family: 'Keania One', 'Bricolage Grotesque', system-ui, sans-serif;
          font-weight: 400;            /* Keania One is a display face — 400 is its only weight */
          letter-spacing: 0.01em;      /* just a breath of air — the font's own proportions do the work */
          line-height: 1;
          /* Subtle italic tilt — Keania One has a forward slant by design */
          font-style: normal;
        }
      `}</style>

      <div
        ref={cardRef}
        className="wc-root"
        style={{
          position: "relative",
          overflow: "hidden",
          margin: 16,
          borderRadius: 24,
          background: bgGradient,
          boxShadow: [
            `0 16px 48px ${theme.shadow}`,
            `0 1px 0 rgba(255,255,255,${D ? "0.08" : "0.55"}) inset`,
            `0 0 0 1px rgba(${D ? "255,255,255,0.06" : "0,0,0,0.04"})`,
          ].join(", "),
          minHeight: 196,
          transition: "background 0.55s ease, box-shadow 0.55s ease",
        }}
      >
        <WeatherCanvas condition={condition} isDark={D} />

        {/* Top edge highlight */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1, background:`linear-gradient(90deg,transparent 5%,rgba(255,255,255,${D?"0.14":"0.7"}) 50%,transparent 95%)`, pointerEvents:"none", zIndex:2 }} />
        {/* Bottom vignette */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"42%", background:`linear-gradient(to top,rgba(${D?"0,0,0,0.28":"0,0,0,0.05"}) 0%,transparent 100%)`, pointerEvents:"none", zIndex:1 }} />
        {/* Shimmer sweep */}
        <div ref={shimmerRef} style={{ position:"absolute",inset:0,width:"40%", background:`linear-gradient(108deg,transparent 20%,rgba(255,255,255,${D?"0.06":"0.14"}) 50%,transparent 80%)`, pointerEvents:"none", zIndex:2, transform:"translateX(-115%)" }} />

        {/* ════════ TABLE BADGE ════════ */}
        {tableNumber && tableVisible && (
          <div
            ref={tableRef}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 10,
              opacity: 0,
            }}
          >
            <div
              className="wc-badge-ring"
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: 18,
                border: `1.5px solid rgba(255,255,255,${D ? "0.24" : "0.6"})`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 14px 10px",
                borderRadius: 18,
                background: D ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.32)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid rgba(255,255,255,${D ? "0.14" : "0.52"})`,
                boxShadow: [
                  "0 6px 24px rgba(0,0,0,0.18)",
                  `0 1px 0 rgba(255,255,255,${D ? "0.1" : "0.6"}) inset`,
                ].join(", "),
                minWidth: 76,
                gap: 2,
              }}
            >
              <span style={{ fontSize: 11, lineHeight: 1, opacity: 0.6, marginBottom: 2 }}>🪑</span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 7,
                  fontWeight: 800,
                  color: D ? "rgba(255,255,255,0.42)" : theme.text,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  lineHeight: 1,
                  opacity: D ? 1 : 0.6,
                }}
              >
                Table
              </span>
              <span
                className="wc-table-num"
                style={{
                  fontSize: tableNumber.length > 3 ? 18 : 24,
                  color: D ? "#ffffff" : theme.text,
                  marginTop: 1,
                }}
              >
                {tableNumber}
              </span>
            </div>
          </div>
        )}

        {/* ════════ MAIN CONTENT ════════ */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            padding: "20px 20px 18px",
            paddingRight: tableNumber ? 96 : 20,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* ── Row 1: Greeting label ── */}
          <p
            ref={greetRef}
            className="wc-greet-label"
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: theme.sub,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {greetLabel}
          </p>

          {/* ── Row 2: "Hey," prefix ── */}
          <p
            ref={prefixRef}
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12,
              fontWeight: 300,
              color: theme.sub,
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 2,
            }}
          >
            {isGuest ? "Welcome," : "Hey,"}
          </p>

          {/* ── Row 3: Big name (Keania One) + wave ── */}
          <div
            ref={nameRowRef}
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}
          >
            <span
              className="wc-name capitalize"
              style={{
                fontSize: "clamp(36px,10vw,52px)",
                color: theme.text,
                textShadow: nameTextShadow,
              }}
            >
              {displayName}
            </span>
            
          </div>

          {/* ── Row 4: Sub line ── */}
          <p
            ref={subRef}
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12,
              fontWeight: 400,
              color: theme.sub,
              letterSpacing: "0.01em",
              lineHeight: 1.4,
              marginBottom: 12,
            }}
          >
            {greetSub}
          </p>

          {/* ── Row 5: Pills ── */}
          <div
            ref={pillsRef}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 7,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {/* Weather pill */}
            <span
              className="wc-pill"
              style={{
                background: D ? "rgba(0,0,0,0.26)" : "rgba(255,255,255,0.42)",
                color: theme.text,
                border: `1px solid rgba(255,255,255,${D ? "0.13" : "0.55"})`,
                boxShadow: `0 1px 0 rgba(255,255,255,${D ? "0.06" : "0.6"}) inset`,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{wMeta.icon}</span>
              <span>{wMeta.label}</span>
              {weather?.temp != null && (
                <span style={{ opacity: 0.6, fontWeight: 500 }}>
                  · {Math.round(weather.temp)}°C
                </span>
              )}
            </span>

            {/* Tier pill — logged-in only */}
            {!isGuest && (
              <span
                className="wc-pill"
                style={{
                  background: D ? "rgba(0,0,0,0.26)" : "rgba(255,255,255,0.42)",
                  color: theme.text,
                  border: `1px solid rgba(255,255,255,${D ? "0.13" : "0.55"})`,
                  boxShadow: `0 1px 0 rgba(255,255,255,${D ? "0.06" : "0.6"}) inset`,
                }}
              >
                <span style={{ fontSize: 12 }}>{tc.emoji}</span>
                <span>{tc.label}</span>
              </span>
            )}
          </div>

          {/* ── Row 6: Status strip ── */}
          <div
            ref={stripRef}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
            }}
          >
            {sessionStart && (
              <span className="wc-strip-item" style={{ color: theme.text }}>
                <Clock size={9} strokeWidth={2.5} />
                <span>Since {sessionStart}</span>
              </span>
            )}
            {cartCount > 0 && (
              <span className="wc-strip-item" style={{ color: theme.text }}>
                <ShoppingBag size={9} strokeWidth={2.5} />
                <span>{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</span>
              </span>
            )}
            {session?.status === "active" && (
              <span className="wc-strip-item" style={{ color: theme.text }}>
                <Wifi size={9} strokeWidth={2.5} />
                <span>Active session</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeCard;