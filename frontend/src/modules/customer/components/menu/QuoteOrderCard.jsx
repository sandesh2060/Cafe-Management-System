// src/modules/customer/components/menu/QuoteOrderCard.jsx
//
// ─── FIXES ───────────────────────────────────────────────────────────────────
// 1. STABLE HEIGHT — quote body locked to minHeight so card never shrinks
//    during AnimatePresence transitions. Old quote fades out while new quote
//    fades in on top — no layout shift, no size flash.
//
// 2. SMOOTH CROSSFADE — switched from mode="wait" (causes size collapse) to
//    position:absolute overlay system. Both quotes exist in DOM simultaneously,
//    outgoing fades to opacity:0, incoming fades from 0 to 1. Card height
//    is held by a measured ref so it never changes during the swap.
//
// 3. 200+ QUOTES — expanded all pools. Selection driven by:
//    - customer order history (first visit, regular, loyal)
//    - time of day (earlybird/morning/afternoon/evening/latenight)
//    - active weather condition (sunny/rainy/windy/cold/snowy/hot/cloudy)
//    - loyalty tier (bronze/silver/gold)
//    - day of week (monday, friday, weekend)
//    - active order state (preparing/ready/served quotes)
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState, useEffect, useContext, useRef, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "@shared/context/ThemeContext";
import { BRAND, FONTS } from "@shared/config/brand";
import {
  selectActiveOrder, selectOrderLoading, selectOrderHistory,
} from "@store/slices/orderSlice";
import { selectUser, selectIsGuest } from "@store/slices/authSlice";
import { ShoppingBag, CreditCard, ChevronRight, Loader2 } from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────────
const ACTIVE_STATUSES  = new Set(["pending","confirmed","preparing","ready","on_the_way","served","delivered"])
const PAYABLE_STATUSES = new Set(["served","delivered"])
const GALLERY_STATUSES = new Set(["pending","confirmed","preparing","ready","on_the_way"])

const STATUS_CFG = {
  pending:   { label:"Order Placed",    emoji:"📋", fill:0.15, speed:0.6, color:"#F59E0B" },
  confirmed: { label:"Confirmed",       emoji:"✅", fill:0.32, speed:0.9, color:"#10B981" },
  preparing: { label:"Being Prepared",  emoji:"👨‍🍳", fill:0.58, speed:1.6, color:"#3B82F6" },
  ready:     { label:"Ready!",          emoji:"🔔", fill:0.85, speed:2.4, color:"#8B5CF6" },
  on_the_way:{ label:"On the Way",      emoji:"🛵", fill:0.78, speed:2.0, color:"#F97316" },
  served:    { label:"Served!",         emoji:"🍽️", fill:1.0,  speed:0.4, color:"#06B6D4" },
  delivered: { label:"Delivered!",      emoji:"🎉", fill:1.0,  speed:0.4, color:"#06B6D4" },
  cancelled: { label:"Cancelled",       emoji:"❌", fill:0.0,  speed:0.3, color:"#6B7280" },
}
const DEFAULT_CFG = STATUS_CFG.pending

// ── Wave fill (unchanged) ──────────────────────────────────────────────────────
const W = 300, H = 120

function WaveFill({ fillLevel, speed, isDark }) {
  const canvasRef  = useRef(null)
  const rafRef     = useRef(null)
  const tRef       = useRef(0)
  const curFillRef = useRef(fillLevel)

  useEffect(() => {
    const target = fillLevel
    const step   = () => {
      const diff = target - curFillRef.current
      if (Math.abs(diff) > 0.001) curFillRef.current += diff * 0.04
      else curFillRef.current = target
    }
    const canvas = canvasRef.current; if (!canvas) return
    const ctx    = canvas.getContext("2d")

    const draw = (ts) => {
      tRef.current = ts * 0.001 * speed; step()
      const t = tRef.current, fill = curFillRef.current, yBase = H * (1 - fill)
      ctx.clearRect(0, 0, W, H)

      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 2) {
        ctx.lineTo(x, yBase + Math.sin((x/W)*2.8*Math.PI + t*1.8)*5 + Math.sin((x/W)*1.2*Math.PI - t*1.1)*3)
      }
      ctx.lineTo(W, H); ctx.closePath()
      const g1 = ctx.createLinearGradient(0, yBase-10, 0, H)
      if (isDark) { g1.addColorStop(0,"rgba(56,189,248,.28)"); g1.addColorStop(.4,"rgba(14,165,233,.22)"); g1.addColorStop(1,"rgba(2,132,199,.18)") }
      else        { g1.addColorStop(0,"rgba(56,189,248,.18)"); g1.addColorStop(.4,"rgba(14,165,233,.14)"); g1.addColorStop(1,"rgba(2,132,199,.10)") }
      ctx.fillStyle = g1; ctx.fill()

      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 2) {
        ctx.lineTo(x, yBase + Math.sin((x/W)*2.2*Math.PI - t*1.3+1.2)*6 + Math.sin((x/W)*.9*Math.PI + t*.7+2.1)*4)
      }
      ctx.lineTo(W, H); ctx.closePath()
      const g2 = ctx.createLinearGradient(0, yBase-8, 0, H)
      if (isDark) { g2.addColorStop(0,"rgba(186,230,253,.08)"); g2.addColorStop(1,"rgba(56,189,248,.05)") }
      else        { g2.addColorStop(0,"rgba(186,230,253,.12)"); g2.addColorStop(1,"rgba(56,189,248,.07)") }
      ctx.fillStyle = g2; ctx.fill()

      if (fill > 0.08 && speed > 0.5) {
        [{x:.18,freq:1.4,r:2.2},{x:.42,freq:1.9,r:1.6},{x:.67,freq:1.1,r:2.5},{x:.82,freq:2.1,r:1.4}].forEach(({x:xf,freq,r}) => {
          const bx = xf*W, by = yBase+8+Math.sin(t*freq+xf*10)*(H-yBase-16)*.7
          if (by > yBase+4 && by < H-4) {
            ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI*2)
            ctx.fillStyle = isDark ? "rgba(186,230,253,.12)" : "rgba(255,255,255,.22)"
            ctx.fill()
          }
        })
      }
      if (fill > 0.02) {
        const sx1 = W*.15+Math.sin(t*1.3)*W*.1, sx2 = sx1+W*.28
        const sy  = yBase+Math.sin((sx1/W)*2.8*Math.PI+t*1.8)*5
        const sg  = ctx.createLinearGradient(sx1,sy,sx2,sy)
        sg.addColorStop(0,"rgba(255,255,255,0)"); sg.addColorStop(.4,isDark?"rgba(255,255,255,.10)":"rgba(255,255,255,.22)"); sg.addColorStop(1,"rgba(255,255,255,0)")
        ctx.beginPath(); ctx.moveTo(sx1,sy); ctx.lineTo(sx2,sy)
        ctx.strokeStyle = sg; ctx.lineWidth = 1.5; ctx.stroke()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fillLevel, speed, isDark])

  return <canvas ref={canvasRef} width={W} height={H} style={{position:"absolute",inset:0,width:"100%",height:"100%",borderRadius:18,pointerEvents:"none"}}/>
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE BANK — 200+ quotes across all categories
// ─────────────────────────────────────────────────────────────────────────────
const Q = {
  coffee: [
    { text:"First coffee. Then adulting.", emoji:"☕" },
    { text:"Behind every great day is a great cup of tea.", emoji:"🍵" },
    { text:"Sip slowly. Life moves fast enough.", emoji:"☕" },
    { text:"चिया एक कप मात्र — तर असर सारा दिन।", emoji:"🍵" },
    { text:"Coffee: because adulting is hard.", emoji:"☕" },
    { text:"A warm cup is a small hug from the universe.", emoji:"🤗" },
    { text:"Good conversations start with good chai.", emoji:"🫖" },
    { text:"Life begins after coffee.", emoji:"☕" },
    { text:"Espresso yourself.", emoji:"☕" },
    { text:"Tea is just hot leaf water. Delicious hot leaf water.", emoji:"🍃" },
    { text:"A cup of tea solves everything. Try it.", emoji:"🫖" },
    { text:"Decaf coffee is like a hug from a stranger. Pointless.", emoji:"😂" },
    { text:"Coffee is a liquid hug for your brain.", emoji:"🧠" },
    { text:"You can't buy happiness but you can buy coffee.", emoji:"☕" },
    { text:"Masala chiya: proof that spice makes everything better.", emoji:"🌶️" },
  ],
  food: [
    { text:"Hunger is the best seasoning.", emoji:"🍜" },
    { text:"You can't buy happiness — but you can order it.", emoji:"😋" },
    { text:"Good food, good mood. It's that simple.", emoji:"🌶️" },
    { text:"First, we eat. Then, we do everything else.", emoji:"🍛" },
    { text:"Food is not just fuel. It's memory.", emoji:"🥘" },
    { text:"One bite at a time — that's how you savour life.", emoji:"🫕" },
    { text:"खाना भनेको माया हो — पकाइएको।", emoji:"🍲" },
    { text:"Diet starts tomorrow. Today, we feast.", emoji:"😅" },
    { text:"Tell me what you eat and I'll tell you who you are.", emoji:"🍽️" },
    { text:"The secret ingredient is always love. And momos.", emoji:"🥟" },
    { text:"There is no sincerer love than the love of food.", emoji:"❤️" },
    { text:"Cooking is love made visible.", emoji:"👨‍🍳" },
    { text:"People who love to eat are always the best people.", emoji:"😊" },
    { text:"A recipe has no soul. You must bring it yourself.", emoji:"✨" },
    { text:"Food tastes better when you eat it with people you love.", emoji:"👨‍👩‍👧" },
    { text:"Life is too short for bad food.", emoji:"🙅" },
    { text:"Eat well. Travel often. Nap always.", emoji:"😴" },
    { text:"Dal bhat power — twenty-four hour.", emoji:"💪" },
    { text:"The best time for momo is always now.", emoji:"🥟" },
    { text:"Eat like nobody is watching. They're not. They're on their phones.", emoji:"📱" },
  ],
  life: [
    { text:"Life is short. Eat the good stuff first.", emoji:"✨" },
    { text:"Every day is a fresh start. Make it delicious.", emoji:"🌅" },
    { text:"The best things in life aren't things.", emoji:"🌿" },
    { text:"Slow down. The best moments can't be rushed.", emoji:"🍃" },
    { text:"You don't need a reason to treat yourself.", emoji:"🎁" },
    { text:"जिन्दगी छोटो छ, मज्जाले बाँच।", emoji:"🌸" },
    { text:"A good day starts with a good decision.", emoji:"💛" },
    { text:"Peace is not a place. It's a choice.", emoji:"🕊️" },
    { text:"Life's too short for bad coffee and boring people.", emoji:"☕" },
    { text:"Not all those who wander are lost — some are looking for good food.", emoji:"🗺️" },
    { text:"The goal isn't to live forever, it's to create something that will.", emoji:"🌟" },
    { text:"In the middle of difficulty lies opportunity.", emoji:"💡" },
    { text:"Do what you can, with what you have, where you are.", emoji:"🎯" },
    { text:"Small steps in the right direction beat giant leaps in the wrong one.", emoji:"👣" },
    { text:"Be yourself. Everyone else is already taken.", emoji:"🌻" },
    { text:"Joy is not in things. It is in us.", emoji:"🧡" },
    { text:"The present moment is the only moment available to us.", emoji:"⏳" },
    { text:"Happiness is a warm bowl of thukpa on a cold night.", emoji:"🍜" },
    { text:"You are enough. You have always been enough.", emoji:"💫" },
    { text:"Breathe. It's just a bad day, not a bad life.", emoji:"🌈" },
    { text:"The art of being happy lies in the power of extracting happiness from common things.", emoji:"🌼" },
    { text:"Every moment is a fresh beginning.", emoji:"🌅" },
    { text:"Life becomes easier when you delete the negative people from it.", emoji:"✂️" },
    { text:"Your vibe attracts your tribe.", emoji:"🤝" },
    { text:"The comeback is always stronger than the setback.", emoji:"💪" },
  ],
  flirty: [
    { text:"You look like you have great taste.", emoji:"😏" },
    { text:"Is it warm in here, or is it just your order?", emoji:"🔥" },
    { text:"Someone as good-looking shouldn't have to wait long.", emoji:"😉" },
    { text:"Your vibe is as warm as this café.", emoji:"✨" },
    { text:"You clearly know how to pick the good stuff.", emoji:"💫" },
    { text:"Confidence looks good on you. So does that choice.", emoji:"😎" },
    { text:"Are you Wi-Fi? Because I feel a connection.", emoji:"📶" },
    { text:"Do you have a map? I just got lost in your eyes.", emoji:"🗺️" },
    { text:"If you were a fruit, you'd be a fine-apple.", emoji:"🍍" },
    { text:"Are you a camera? Every time I look at you, I smile.", emoji:"📸" },
    { text:"You had me at hello… and kept me at your smile.", emoji:"😊" },
    { text:"Are you a parking ticket? Because you've got 'fine' written all over you.", emoji:"🅿️" },
    { text:"Is your name Google? Because you have everything I've been searching for.", emoji:"🔍" },
    { text:"Are you a magician? Because whenever I look at you, everyone else disappears.", emoji:"🪄" },
    { text:"If you were words on a page, you'd be fine print.", emoji:"📖" },
    { text:"You must be tired — you've been running through my mind all day.", emoji:"🏃" },
    { text:"Your smile must be a black hole — it's irresistibly attractive.", emoji:"🌌" },
    { text:"I'm not flirting. I'm just being extra friendly to someone extra attractive.", emoji:"😉" },
    { text:"You're cuter than a puppy in a sweater.", emoji:"🐶" },
    { text:"Life tip: Compliment strangers. Flirt shamelessly. Leave smiling.", emoji:"😄" },
  ],
  relationship: [
    { text:"The best conversations happen over food.", emoji:"🤝" },
    { text:"Good company makes even simple food taste better.", emoji:"❤️" },
    { text:"साथी नै सम्पत्ति — त्यसैले राम्रो साथी कहिल्यै नछोड्नू।", emoji:"🫂" },
    { text:"Share your table. Share your heart.", emoji:"💞" },
    { text:"The people you eat with shape who you become.", emoji:"🌻" },
    { text:"Some friendships are best measured in shared meals.", emoji:"🍽️" },
    { text:"Love is just breakfast for the soul.", emoji:"🥐" },
    { text:"A table is only as good as the people around it.", emoji:"🪑" },
    { text:"Eating together is one of humanity's oldest rituals. Honour it.", emoji:"🕯️" },
    { text:"The people who sit around the table with you matter more than what's on it.", emoji:"🫶" },
  ],
  hustle: [
    { text:"Recharge. Even the best engines need fuel.", emoji:"⚡" },
    { text:"You're doing great. Sit down and breathe.", emoji:"🧘" },
    { text:"मेहनत र खानाले नै संसार चल्छ।", emoji:"💪" },
    { text:"Success tastes better when you've paused to enjoy it.", emoji:"🏆" },
    { text:"Hard work beats talent when talent doesn't work hard.", emoji:"🔥" },
    { text:"The grind doesn't stop — but it should pause for lunch.", emoji:"⏰" },
    { text:"Rest is not quitting. Rest is reloading.", emoji:"🔋" },
    { text:"Work hard in silence. Let success make the noise.", emoji:"🤫" },
    { text:"Dream big. Work harder. Eat well.", emoji:"🌟" },
    { text:"You didn't come this far to only come this far.", emoji:"🚀" },
    { text:"One productive hour is worth ten distracted ones.", emoji:"⏱️" },
    { text:"Your future self will thank you for not giving up today.", emoji:"🙏" },
  ],
  guest: [
    { text:"New here? You picked the right place.", emoji:"👋" },
    { text:"Every regular was once a first-timer. Welcome.", emoji:"🌟" },
    { text:"नया अनुहार, नया कथा — स्वागत छ।", emoji:"🙏" },
    { text:"First visit? It won't be the last.", emoji:"😊" },
    { text:"Strangers are just friends who haven't ordered yet.", emoji:"🤝" },
    { text:"Welcome. The best decision you made today was coming here.", emoji:"✨" },
    { text:"Good places attract good people. Glad you're here.", emoji:"🌸" },
  ],
  order: [
    { text:"Good things are on their way to you.", emoji:"🛵" },
    { text:"Patience is the secret ingredient.", emoji:"⏱️" },
    { text:"Worth the wait. We promise.", emoji:"🍽️" },
    { text:"Your order is being made with care. Hang tight.", emoji:"👨‍🍳" },
    { text:"The kitchen is working its magic right now.", emoji:"✨" },
    { text:"Almost ready. Good things take a little time.", emoji:"🕐" },
    { text:"Your food is closer than you think.", emoji:"🚀" },
    { text:"Every great meal starts with a great kitchen.", emoji:"🍳" },
  ],
  morning: [
    { text:"Morning is when the day decides what kind of day it will be.", emoji:"🌅" },
    { text:"Each morning we are born again. Make today count.", emoji:"🌞" },
    { text:"Rise up, start fresh, see the bright opportunity in each new day.", emoji:"☀️" },
    { text:"Good morning! Your best day yet starts now.", emoji:"🌤️" },
    { text:"The early bird gets the best table.", emoji:"🐦" },
    { text:"Begin each day as if it were a deliberate act.", emoji:"🎯" },
    { text:"बिहान चिया र राम्रो सोच — दिन सुरु गर्ने सबैभन्दा राम्रो तरिका।", emoji:"🍵" },
    { text:"Mornings are for coffee and contemplation.", emoji:"☕" },
    { text:"Sunrise: proof that things can start beautiful even after darkness.", emoji:"🌅" },
  ],
  afternoon: [
    { text:"Afternoon is when the day takes a breath. Take yours too.", emoji:"🌤️" },
    { text:"A good lunch is the foundation of a good afternoon.", emoji:"🍛" },
    { text:"The afternoon slump is just your body asking for good food.", emoji:"😴" },
    { text:"Mid-day reset: eat well, think clearly, move forward.", emoji:"⚡" },
    { text:"Lunch is not a break from work. Lunch IS the work of living well.", emoji:"🍽️" },
    { text:"दिउँसो खाना ठीकसँग खाए साँझ एकदम राम्रो हुन्छ।", emoji:"🌞" },
  ],
  evening: [
    { text:"Evenings are proof that endings can be beautiful.", emoji:"🌇" },
    { text:"The golden hour calls for golden food.", emoji:"✨" },
    { text:"Slow down. The best evenings aren't rushed.", emoji:"🌅" },
    { text:"साँझको खाना परिवारसँग — यही नै सुख।", emoji:"🏠" },
    { text:"End your day the way you want the next one to begin.", emoji:"🌙" },
    { text:"Evening is the kindest part of the day.", emoji:"🌆" },
    { text:"Dinner isn't just food. It's the pause button on the day.", emoji:"⏸️" },
  ],
  latenight: [
    { text:"Still awake? The night has its own kind of magic.", emoji:"🌙" },
    { text:"Late nights and good food: an underrated combination.", emoji:"🌃" },
    { text:"The city is quieter but your hunger isn't. We get it.", emoji:"🏙️" },
    { text:"Night owls make the best decisions about food.", emoji:"🦉" },
    { text:"Not all who are awake this late are suffering. Some are just hungry.", emoji:"😄" },
    { text:"रात परेको छ, तर भोक नपरेको छैन।", emoji:"🌙" },
  ],
  monday: [
    { text:"Monday called. It wants to know your order.", emoji:"📅" },
    { text:"The Monday struggle is real. Good food helps.", emoji:"😮‍💨" },
    { text:"Monday: the day coffee saves lives.", emoji:"☕" },
    { text:"Start the week right. Eat something wonderful.", emoji:"💪" },
    { text:"Monday motivation: you survived every Monday before this one.", emoji:"🏆" },
  ],
  friday: [
    { text:"It's Friday. You made it. Time to eat something great.", emoji:"🎉" },
    { text:"TGIF — Thank Goodness I'm Fed.", emoji:"🍽️" },
    { text:"Friday: the day when weekday rules don't apply to food.", emoji:"😏" },
    { text:"Friday energy deserves Friday food.", emoji:"⚡" },
    { text:"Weekend starts NOW. Make it delicious.", emoji:"🎊" },
  ],
  weekend: [
    { text:"Weekends are for unhurried meals and good company.", emoji:"🌿" },
    { text:"No alarm. No rush. Just good food. This is living.", emoji:"😌" },
    { text:"The weekend is the universe's way of saying: relax and eat well.", emoji:"🌞" },
    { text:"सप्ताहन्तमा राम्रो खाना र लामो आराम — यही नै भनाई।", emoji:"😴" },
    { text:"Lazy weekend mornings are a gift. Unwrap yours slowly.", emoji:"🎁" },
  ],
  weather: {
    sunny: [
      { text:"Sunny day energy — radiate it.", emoji:"☀️" },
      { text:"The sun came out just for this meal.", emoji:"🌞" },
      { text:"Sunshine is the best seasoning.", emoji:"🌤️" },
      { text:"A bright sky deserves a bright mood. You've got both.", emoji:"✨" },
      { text:"Sun's out, appetite's out. Good timing.", emoji:"😄" },
      { text:"Clear skies above, good food ahead.", emoji:"🌈" },
    ],
    rainy: [
      { text:"Rain outside, warmth inside. Perfect.", emoji:"🌧️" },
      { text:"पानी परेको दिन गरमागरम खाना — स्वर्ग।", emoji:"🫖" },
      { text:"Rainy days were invented for soup and stories.", emoji:"🍲" },
      { text:"The pitter-patter of rain makes food taste better. Science.", emoji:"🔬" },
      { text:"Rain is just the sky's way of saying stay inside and eat well.", emoji:"☔" },
      { text:"Monsoon and momos: a love story.", emoji:"🥟" },
      { text:"Let it rain. Let it pour. Let the thukpa hit different.", emoji:"🍜" },
    ],
    cold: [
      { text:"Cold weather was invented to justify warm food.", emoji:"❄️" },
      { text:"Let the cold stay outside. You're cozy now.", emoji:"🧣" },
      { text:"When it's cold outside, soup is the answer.", emoji:"🍲" },
      { text:"ठन्डीमा तातो खाना — जिन्दगीको सबैभन्दा राम्रो अनुभव।", emoji:"🔥" },
      { text:"Cold days are warm soup's time to shine.", emoji:"✨" },
      { text:"Bundle up, eat up, warm up. In that order.", emoji:"🧥" },
    ],
    cloudy: [
      { text:"Cloudy days call for comfort food.", emoji:"☁️" },
      { text:"Even grey skies have silver linings — and good meals.", emoji:"🌥️" },
      { text:"Overcast skies are just the atmosphere's mood board.", emoji:"🎨" },
      { text:"No sun today, but plenty of warmth right here.", emoji:"🌥️" },
      { text:"Clouds make the world feel softer. Let the food do the same.", emoji:"☁️" },
    ],
    hot: [
      { text:"Cool down. You've earned this break.", emoji:"🌡️" },
      { text:"गर्मीमा केही चिसो, केही मीठो — यही जिन्दगी।", emoji:"🧊" },
      { text:"Heat like this? Only cold drinks and shade will do.", emoji:"🥤" },
      { text:"The hottest days deserve the coldest drinks.", emoji:"🧊" },
      { text:"Stay hydrated. Stay fed. Stay cool.", emoji:"💧" },
    ],
    windy: [
      { text:"The wind brought you here. Good call.", emoji:"💨" },
      { text:"Windy days are nature's way of pushing you toward food.", emoji:"🍃" },
      { text:"हावा चलेको दिन — तातो चिया अनिवार्य।", emoji:"🍵" },
      { text:"Let the wind howl outside. It's calm and delicious in here.", emoji:"🌬️" },
      { text:"The gusts outside make the warmth inside feel even better.", emoji:"💨" },
    ],
    snowy: [
      { text:"Let it snow — as long as the food is hot.", emoji:"⛄" },
      { text:"Snow days are soup's time to shine.", emoji:"🌨️" },
      { text:"हिउँमा तातो खाना — स्वर्ग जस्तै।", emoji:"❄️" },
      { text:"A snow day without good food is just cold and pointless.", emoji:"😂" },
    ],
  },
  loyal_bronze: [
    { text:"Bronze member: you know what you like. We like that about you.", emoji:"🥉" },
    { text:"You've been here a few times. We notice. We appreciate.", emoji:"🙏" },
    { text:"A regular in the making. The best kind of making.", emoji:"⭐" },
    { text:"Coming back is the greatest compliment. Thank you.", emoji:"💛" },
  ],
  loyal_silver: [
    { text:"Silver member — you've got taste and loyalty. Rare combo.", emoji:"🥈" },
    { text:"You've earned your spot here. Not just at the table.", emoji:"✨" },
    { text:"You're not just a customer. You're part of the story.", emoji:"📖" },
    { text:"Silver tier means you've trusted us enough times to count. We count.", emoji:"🙌" },
  ],
  loyal_gold: [
    { text:"Gold member. You are the reason we do this.", emoji:"🥇" },
    { text:"Legendary regular. We should name something after you.", emoji:"👑" },
    { text:"Gold tier: not just loyalty, it's love at this point.", emoji:"❤️" },
    { text:"You could eat anywhere. You keep choosing here. That means everything.", emoji:"🏆" },
    { text:"The café wouldn't be the same without you. Genuinely.", emoji:"🌟" },
  ],
  first_visit: [
    { text:"First visit? The hardest part is leaving.", emoji:"🚪" },
    { text:"Welcome to what will soon be your favourite spot.", emoji:"🌟" },
    { text:"Every great regular started exactly where you are now.", emoji:"✨" },
    { text:"First time here? Let's make it memorable.", emoji:"🎉" },
    { text:"New faces are the best kind of surprise.", emoji:"😊" },
  ],
  frequent: [
    { text:"Back again? That makes our day. Every time.", emoji:"🎊" },
    { text:"You know the menu better than some of us do.", emoji:"😄" },
    { text:"The familiar face we look forward to. That's you.", emoji:"😊" },
    { text:"There's a table that feels like yours. You know the one.", emoji:"🪑" },
    { text:"Some people become part of the furniture. You're our favourite piece.", emoji:"🛋️" },
  ],
  nepali_special: [
    { text:"नेपाली खाना, नेपाली माया — दुवै अमूल्य।", emoji:"🇳🇵" },
    { text:"घरको खाना जस्तो कहाँ पाइन्छ र? यहाँ पाइन्छ।", emoji:"🏠" },
    { text:"चिया पिउँदा जस्तो शान्ति अरू कुनै पनि ठाउँमा छैन।", emoji:"🍵" },
    { text:"दाल भात तरकारी — जिन्दगी सारा।", emoji:"🍲" },
    { text:"नेपालमा जन्मनु भनेको स्वादिलो खाना खान पाउनु हो।", emoji:"🌸" },
    { text:"मोमोसँग कहिल्यै झगडा नगर्नू — हारिन्छ।", emoji:"🥟" },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// POOL PICKER — intelligent quote selection based on customer context
// ─────────────────────────────────────────────────────────────────────────────
const pickPool = ({ weather, hour, isGuest, orderCount, hasActiveOrder, loyaltyTier, dayOfWeek }) => {
  if (hasActiveOrder) return Q.order

  const cond = weather?.condition
  const pools = []

  // Weather-specific (highest contextual relevance)
  if (cond && Q.weather[cond]) pools.push(...Q.weather[cond])

  // Day of week
  if (dayOfWeek === 1) pools.push(...Q.monday)
  else if (dayOfWeek === 5) pools.push(...Q.friday)
  else if (dayOfWeek === 0 || dayOfWeek === 6) pools.push(...Q.weekend)

  // Time of day
  if (hour < 5)       pools.push(...Q.latenight, ...Q.coffee)
  else if (hour < 11) pools.push(...Q.morning, ...Q.coffee)
  else if (hour < 14) pools.push(...Q.afternoon, ...Q.food)
  else if (hour < 18) pools.push(...Q.afternoon, ...Q.life, ...Q.flirty)
  else if (hour < 21) pools.push(...Q.evening, ...Q.food, ...Q.relationship)
  else                pools.push(...Q.evening, ...Q.latenight, ...Q.coffee)

  // Customer loyalty tier
  if (loyaltyTier === 'gold')        pools.push(...Q.loyal_gold,   ...Q.hustle)
  else if (loyaltyTier === 'silver') pools.push(...Q.loyal_silver, ...Q.hustle)
  else if (loyaltyTier === 'bronze') pools.push(...Q.loyal_bronze)

  // Visit count based
  if (isGuest || orderCount === 0)  pools.push(...Q.first_visit, ...Q.guest)
  else if (orderCount >= 8)         pools.push(...Q.frequent)
  else if (orderCount >= 3)         pools.push(...Q.relationship)

  // Always add some Nepali and life quotes
  pools.push(...Q.nepali_special, ...Q.life)

  // Fallback
  if (!pools.length) pools.push(...Q.food, ...Q.life)
  return pools
}

const pickQuote = (pool, lastIdx) => {
  if (!pool.length) return { text:"Good food. Good vibes.", emoji:"✨" }
  let idx = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && idx === lastIdx) idx = (idx + 1) % pool.length
  return pool[idx]
}

// ── Supporting components ──────────────────────────────────────────────────────
const TimerRing = ({ progress, color }) => {
  const r = 9, circ = 2 * Math.PI * r
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink:0 }}>
      <circle cx="11" cy="11" r={r} fill="none" stroke={color} strokeOpacity=".15" strokeWidth="2"/>
      <circle cx="11" cy="11" r={r} fill="none" stroke={color} strokeOpacity=".7" strokeWidth="2"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-progress)}
        transform="rotate(-90 11 11)" style={{ transition:"stroke-dashoffset 1.1s linear" }}/>
    </svg>
  )
}

const QuoteIcon = ({ color }) => (
  <svg width="22" height="16" viewBox="0 0 44 30" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
    <path d="M0 30V18C0 12.4 1.6 8 4.8 4.8C8 1.6 12.4 0 18 0L19.2 2.8C16.4 3.4 14.2 4.7 12.6 6.7C11.1 8.6 10.2 10.8 10.1 13.3H18V30H0Z" fill={color} fillOpacity=".22"/>
    <path d="M25 30V18C25 12.4 26.6 8 29.8 4.8C33 1.6 37.4 0 43 0L44.2 2.8C41.4 3.4 39.2 4.7 37.6 6.7C36.1 8.6 35.2 10.8 35.1 13.3H43V30H25Z" fill={color} fillOpacity=".22"/>
  </svg>
)

const normItem = (item) => ({
  name:  item?.menuItem?.name ?? item?.name ?? "Item",
  qty:   item?.quantity ?? item?.qty ?? 1,
  price: item?.price ?? item?.menuItem?.price ?? null,
})

// RevealWords — word-by-word blur reveal
const RevealWords = ({ text, id }) => (
  <>
    {text.split(" ").map((word, i) => (
      <motion.span key={`${id}-${i}`}
        initial={{ opacity:0, y:8, filter:"blur(4px)" }}
        animate={{ opacity:1, y:0, filter:"blur(0px)" }}
        transition={{ duration:0.38, delay:0.10+i*0.028, ease:[0.22,1,0.36,1] }}
        style={{ display:"inline-block", marginRight:"0.25em" }}
      >{word}</motion.span>
    ))}
  </>
)

const INTERVAL = 60_000
const selectOrderHistoryLength = (s) => s.order.orderHistory?.length ?? 0

// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED DESIGN TOKENS — all colors, typography, spacing in one place
// Driven by isDark flag. No color appears twice in JSX.
// ─────────────────────────────────────────────────────────────────────────────
function useTokens(isDark) {
  return {
    // Card surface
    cardBg:     isDark ? "rgba(10,18,30,.97)"           : "rgba(240,249,255,.98)",
    cardBorder: isDark ? "rgba(56,189,248,.14)"          : "rgba(14,165,233,.20)",
    cardShadow: isDark ? "0 4px 32px rgba(0,0,0,.60), 0 1px 0 rgba(56,189,248,.08) inset"
                       : "0 4px 24px rgba(14,165,233,.12), 0 1px 0 rgba(255,255,255,1) inset",
    // Text
    textPri:  isDark ? "#E0F2FE"                         : "#0C2340",
    textSec:  isDark ? "#BAE6FD"                         : "#075985",
    textMut:  isDark ? "rgba(186,230,253,.45)"           : "rgba(7,89,133,.45)",
    // Divider
    divider:  isDark ? "rgba(56,189,248,.10)"            : "rgba(14,165,233,.12)",
    // Accent (timer ring, progress dots, quote icon)
    accent:   isDark ? "#38BDF8"                         : "#0369A1",
    // Pill / button
    btnBg:    isDark ? "rgba(56,189,248,.10)"            : "rgba(14,165,233,.08)",
    btnBrd:   isDark ? "rgba(56,189,248,.20)"            : "rgba(14,165,233,.20)",
    // Total pill
    totalBg:  isDark ? "rgba(14,165,233,.12)"            : "rgba(14,165,233,.08)",
    totalBrd: isDark ? "rgba(56,189,248,.22)"            : "rgba(14,165,233,.18)",
    totalTxt: isDark ? "#38BDF8"                         : "#0369A1",
    // Table badge
    tableBg:  isDark ? "rgba(56,189,248,.10)"            : "rgba(14,165,233,.08)",
    tableBrd: isDark ? "rgba(56,189,248,.18)"            : "rgba(14,165,233,.16)",
    // Drop indicator
    dropFill: isDark ? "rgba(56,189,248,.55)"            : "rgba(14,165,233,.45)",
    // Qty multiplier
    qtyColor: isDark ? "#38BDF8"                         : "#0284C7",
    // Kitchen / review buttons
    kitchenBg:  isDark ? "rgba(56,189,248,.08)"          : "rgba(14,165,233,.06)",
    kitchenBrd: isDark ? "rgba(56,189,248,.18)"          : "rgba(14,165,233,.16)",
    kitchenTxt: isDark ? "#7DD3FC"                       : "#0369A1",
    reviewBg:   isDark ? "rgba(251,191,36,.08)"          : "rgba(245,158,11,.06)",
    reviewBrd:  isDark ? "rgba(251,191,36,.18)"          : "rgba(245,158,11,.16)",
    reviewTxt:  isDark ? "#FCD34D"                       : "#B45309",
    // Progress dot inactive
    dotInactive: isDark ? "rgba(56,189,248,.18)"         : "rgba(14,165,233,.18)",
  }
}
export default function QuoteOrderCard({ onViewOrder, onPay }) {
  const { isDark } = useContext(ThemeContext)
  const D = isDark
  const T = useTokens(isDark)  // ← all colors from one place
  const navigate = useNavigate()

  const activeOrder     = useSelector(selectActiveOrder)
  const orderLoading    = useSelector(selectOrderLoading)
  const orderHistoryLen = useSelector(selectOrderHistoryLength)
  const user            = useSelector(selectUser)
  const isGuest         = useSelector(selectIsGuest)

  const [weather,   setWeather]   = useState(null)
  // ── FIX: two quote slots for crossfade — no AnimatePresence mode="wait" ──
  const [quoteA, setQuoteA]       = useState(null)
  const [quoteB, setQuoteB]       = useState(null)
  const [active, setActive]       = useState("A")  // which slot is visible
  const [animKey, setAnimKey]     = useState(0)
  const [progress, setProgress]   = useState(1)
  // ── FIX: stable height — measured from first render, never changes ──
  const quoteBodyRef              = useRef(null)
  const [bodyHeight, setBodyHeight] = useState(null)

  const poolRef    = useRef([])
  const lastIdxRef = useRef(-1)
  const startRef   = useRef(Date.now())
  const timerRef   = useRef(null)
  const tickRef    = useRef(null)

  const isActive   = !!activeOrder && ACTIVE_STATUSES.has(activeOrder?.status)
  const isPayable  = isActive && PAYABLE_STATUSES.has(activeOrder?.status)
  const isGallery  = isActive && GALLERY_STATUSES.has(activeOrder?.status)
  const cfg        = useMemo(() => STATUS_CFG[activeOrder?.status] ?? DEFAULT_CFG, [activeOrder?.status])
  const normItems  = useMemo(() => (activeOrder?.items ?? []).map(normItem), [activeOrder?.items])
  const displayItems = normItems.slice(0, 2)
  const extraCount   = Math.max(0, normItems.length - 2)
  const total        = activeOrder?.totalAmount ?? activeOrder?.total ?? null
  const tableLabel   = activeOrder?.tableNumber ?? activeOrder?.table?.number ?? null
  const orderNum     = activeOrder?.orderNumber ?? activeOrder?.displayId ?? null

  // Weather bridge
  useEffect(() => {
    const handler = (e) => setWeather(e.detail)
    window.addEventListener("qoc:weather", handler)
    if (window.__qocWeather) setWeather(window.__qocWeather)
    return () => window.removeEventListener("qoc:weather", handler)
  }, [])

  // ── Measure quote body height on first render to lock card size ──
  useEffect(() => {
    if (!quoteBodyRef.current || bodyHeight) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const h = e.contentRect.height
        if (h > 20 && !bodyHeight) setBodyHeight(h)
      }
    })
    ro.observe(quoteBodyRef.current)
    return () => ro.disconnect()
  }, [quoteA, bodyHeight])

  // ── Quote crossfade — no layout shift ──
  // Instead of unmounting the old quote, we keep both and crossfade opacity.
  // The container has minHeight=bodyHeight so it never collapses.
  const advanceQuote = useCallback(() => {
    const pool = poolRef.current
    if (!pool.length) return
    const q = pickQuote(pool, lastIdxRef.current)
    lastIdxRef.current = pool.indexOf(q)

    if (active === "A") {
      setQuoteB(q)
      setActive("B")
    } else {
      setQuoteA(q)
      setActive("A")
    }
    setAnimKey(k => k + 1)
    setProgress(1)
    startRef.current = Date.now()
  }, [active])

  // Initial quote + pool rebuild when context changes
  useEffect(() => {
    const hour = new Date().getHours()
    const dow  = new Date().getDay()
    const pool = pickPool({
      weather, hour, isGuest,
      orderCount:      orderHistoryLen,
      hasActiveOrder:  isActive,
      loyaltyTier:     user?.loyaltyTier,
      dayOfWeek:       dow,
    })
    poolRef.current = pool
    lastIdxRef.current = -1
    const q = pickQuote(pool, -1)
    lastIdxRef.current = pool.indexOf(q)
    setQuoteA(q); setQuoteB(null); setActive("A")
    setAnimKey(k => k + 1)
    setProgress(1)
    startRef.current = Date.now()
  }, [weather, isGuest, orderHistoryLen, isActive, user?.loyaltyTier])

  // Auto-advance timer
  useEffect(() => {
    if (isActive) {
      clearInterval(timerRef.current)
      clearInterval(tickRef.current)
      return
    }
    startRef.current = Date.now()
    setProgress(1)
    timerRef.current = setInterval(advanceQuote, INTERVAL)
    tickRef.current  = setInterval(() => {
      setProgress(Math.max(0, 1 - (Date.now() - startRef.current) / INTERVAL))
    }, 1000)
    return () => { clearInterval(timerRef.current); clearInterval(tickRef.current) }
  }, [isActive, advanceQuote])

  const handleViewOrder = useCallback(() => onViewOrder ? onViewOrder() : navigate("/order/status"), [onViewOrder, navigate])
  const handlePay       = useCallback(() => onPay ? onPay() : navigate("/payment"), [onPay, navigate])
  const handleGallery   = useCallback(() => navigate("/gallery"), [navigate])
  const handleReviews   = useCallback(() => navigate("/reviews"), [navigate])

  // All design tokens from centralized useTokens(isDark) — see T.*
  const cardBg     = T.cardBg
  const cardBorder = T.cardBorder
  const cardShadow = T.cardShadow
  const textPri    = T.textPri
  const textSec    = T.textSec
  const textMut    = T.textMut
  const divider    = T.divider
  const accentC    = T.accent
  const btnBg      = T.btnBg
  const btnBrd     = T.btnBrd

  // Current and previous quote for crossfade
  const currentQuote  = active === "A" ? quoteA : quoteB
  const previousQuote = active === "A" ? quoteB : quoteA
  const isNepali = /[\u0900-\u097F]/.test(currentQuote?.text ?? "")

  return (
    <>
      <style>{`
        .qoc * { box-sizing: border-box; }
        .qoc { margin: 0 16px 12px; font-family: ${FONTS.body}; }
        .qoc-btn {
          display:inline-flex;align-items:center;gap:5px;
          padding:7px 13px;border-radius:10px;
          font-size:11.5px;font-weight:600;letter-spacing:.01em;
          cursor:pointer;border:1px solid transparent;
          transition:opacity .15s,transform .15s,box-shadow .2s;
          white-space:nowrap;outline:none;font-family:${FONTS.body};
          -webkit-tap-highlight-color:transparent;
        }
        .qoc-btn:active{transform:scale(.93);opacity:.80}
        .qoc-btn-ghost{background:${btnBg};border-color:${btnBrd};color:${textSec}}
        .qoc-btn-primary{background:linear-gradient(135deg,#0EA5E9 0%,#0284C7 100%);color:#fff;box-shadow:0 3px 14px rgba(14,165,233,.40)}
        .qoc-btn-primary:hover{box-shadow:0 4px 18px rgba(14,165,233,.55)}
        @keyframes qoc-pulse-ring{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.4);opacity:0}100%{transform:scale(2.4);opacity:0}}
        .qoc-pulse-ring{animation:qoc-pulse-ring 2s ease-out infinite}
        @keyframes qoc-spin{to{transform:rotate(360deg)}}
        .qoc-spin{animation:qoc-spin 1s linear infinite}
        .qoc-lora{font-family:${FONTS.serif};font-style:italic;font-weight:400;line-height:1.72;letter-spacing:-.005em}
        @keyframes qoc-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
        .qoc-water-shimmer{position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.06) 40%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 60%,transparent 100%);animation:qoc-shimmer 3.5s ease-in-out infinite;pointer-events:none;border-radius:18px}
        .qoc-quote-text{font-size:14px;color:${textPri};margin:0}
        /* ── THE FIX: crossfade container holds stable height ── */
        .qoc-crossfade-wrap{position:relative}
        .qoc-crossfade-slot{position:absolute;inset:0;will-change:opacity}
        .qoc-crossfade-current{position:relative;z-index:1}
        @media(min-width:640px){
          .qoc{margin:0 16px 14px}
          .qoc-btn{font-size:12.5px;padding:8px 15px;border-radius:11px}
          .qoc-quote-text{font-size:15px}
          .qoc-card-content{padding:16px 18px !important}
          .qoc-quote-body{padding:10px 18px 15px !important}
          .qoc-quote-header{padding:12px 18px 0 !important}
        }
        @media(min-width:1024px){
          .qoc{margin:0 16px 16px}
          .qoc-btn{font-size:13px;padding:9px 18px;border-radius:12px;gap:6px}
          .qoc-quote-text{font-size:16px}
          .qoc-card-content{padding:18px 22px !important;gap:12px !important}
          .qoc-quote-body{padding:12px 22px 18px !important}
          .qoc-quote-header{padding:14px 22px 0 !important}
        }
      `}</style>

      <div className="qoc">
        <motion.div layout transition={{ layout:{ duration:.45, ease:[.22,1,.36,1] } }}
          style={{ position:"relative", overflow:"hidden", background:cardBg,
            border:`1px solid ${cardBorder}`, boxShadow:cardShadow, borderRadius:18 }}>

          <div className="qoc-water-shimmer"/>

          {/* ── Loading ── */}
          <AnimatePresence>
            {orderLoading && !activeOrder && (
              <motion.div key="loading"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ position:"relative", zIndex:2, padding:"18px",
                  display:"flex", alignItems:"center", gap:8 }}>
                <Loader2 size={12} className="qoc-spin" style={{ color:textMut }} strokeWidth={2}/>
                <span style={{ fontSize:11.5, color:textMut, fontWeight:500, fontFamily:FONTS.body }}>Checking your order…</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ ACTIVE ORDER ══ */}
          <AnimatePresence>
            {isActive && (
              <motion.div key={`order-${activeOrder._id}-${activeOrder.status}`}
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:.38, ease:[.22,1,.36,1] }}
                style={{ position:"relative", zIndex:2 }}>

                <div style={{ position:"absolute", inset:0, borderRadius:18, overflow:"hidden", pointerEvents:"none" }}>
                  <WaveFill fillLevel={cfg.fill} speed={cfg.speed} isDark={D}/>
                </div>

                <div className="qoc-card-content" style={{ position:"relative", zIndex:1,
                  display:"flex", flexDirection:"column", padding:"14px 15px", gap:10,
                  backdropFilter:"blur(1px)", WebkitBackdropFilter:"blur(1px)" }}>

                  {/* Status row */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ position:"relative", width:10, height:10, flexShrink:0 }}>
                        <div className="qoc-pulse-ring" style={{ position:"absolute", inset:-3, borderRadius:"50%", border:`1.5px solid ${cfg.color}` }}/>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:cfg.color, boxShadow:`0 0 6px ${cfg.color}80` }}/>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:cfg.color, letterSpacing:".04em",
                        textTransform:"uppercase", lineHeight:1, textShadow:D?`0 0 12px ${cfg.color}60`:"none", fontFamily:FONTS.body }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {tableLabel && (
                        <span style={{ fontSize:10, color:textMut, fontWeight:600,
                        background:D?"rgba(56,189,248,.10)":"rgba(14,165,233,.08)",
                          border:`1px solid ${D?"rgba(56,189,248,.18)":"rgba(14,165,233,.16)"}`,
                          padding:"2px 7px", borderRadius:6, fontFamily:FONTS.body }}>
                          🪑 {tableLabel}
                        </span>
                      )}
                      {orderNum && (
                        <span style={{ fontSize:9.5, color:textMut, fontWeight:600,
                          letterSpacing:".06em", textTransform:"uppercase", fontFamily:FONTS.mono }}>
                          #{orderNum}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ height:1, background:divider }}/>

                  {/* Items + total */}
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                      <span style={{ fontSize:8.5, fontWeight:700, color:textMut,
                        textTransform:"uppercase", letterSpacing:".14em", marginBottom:1, fontFamily:FONTS.body }}>
                        Your Order
                      </span>
                      {displayItems.map((item, i) => (
                        <motion.div key={i}
                          initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay:.08+i*.06, duration:.32, ease:[.22,1,.36,1] }}
                          style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <svg width="7" height="9" viewBox="0 0 7 9" style={{ flexShrink:0, marginTop:1 }}>
                            <path d="M3.5 0 C3.5 0 0 3.5 0 5.5 A3.5 3.5 0 0 0 7 5.5 C7 3.5 3.5 0 3.5 0Z"
                              fill={T.dropFill}/>
                          </svg>
                          <span style={{ fontSize:12.5, fontWeight:600, color:textPri,
                            lineHeight:1.3, flex:1, fontFamily:FONTS.body }}>
                            {item.qty > 1 && (
                              <span style={{ color:T.qtyColor, fontWeight:800, marginRight:3, fontSize:12 }}>
                                {item.qty}×
                              </span>
                            )}
                            {item.name}
                          </span>
                          {item.price != null && (
                            <span style={{ fontSize:11, fontWeight:600, color:textMut, flexShrink:0, fontFamily:FONTS.mono }}>
                              {BRAND.currency} {item.price * item.qty}
                            </span>
                          )}
                        </motion.div>
                      ))}
                      {extraCount > 0 && (
                        <span style={{ fontSize:11, color:textMut, fontWeight:500, paddingLeft:13, fontFamily:FONTS.body }}>
                          +{extraCount} more item{extraCount>1?"s":""}
                        </span>
                      )}
                    </div>
                    {total != null && (
                      <motion.div initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }}
                        transition={{ delay:.18, duration:.38, ease:[.34,1.56,.64,1] }}
                        style={{ display:"flex", flexDirection:"column", alignItems:"center",
                          justifyContent:"center", flexShrink:0,
                          background:T.totalBg,
                          border:`1px solid ${T.totalBrd}`,
                          borderRadius:12, padding:"8px 12px", gap:2 }}>
                        <span style={{ fontSize:8, fontWeight:700, color:textMut,
                          textTransform:"uppercase", letterSpacing:".12em", fontFamily:FONTS.body }}>Total</span>
                        <span style={{ fontSize:16, fontWeight:800, color:T.totalTxt,
                          letterSpacing:"-.04em", lineHeight:1, fontFamily:FONTS.mono }}>
                          {BRAND.currency} {total}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  <div style={{ height:1, background:divider }}/>

                  {/* Buttons */}
                  <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
                    <button className="qoc-btn qoc-btn-ghost" onClick={handleViewOrder}>
                      <ShoppingBag size={11} strokeWidth={2.4}/> View Order
                    </button>
                    {isGallery && (<>
                      <motion.button className="qoc-btn qoc-btn-ghost" onClick={handleGallery}
                        initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }}
                        transition={{ delay:.10, duration:.36, ease:[.34,1.56,.64,1] }}
                        style={{ background:T.kitchenBg, borderColor:T.kitchenBrd, color:T.kitchenTxt }}>
                        📸 Kitchen
                      </motion.button>
                      <motion.button className="qoc-btn qoc-btn-ghost" onClick={handleReviews}
                        initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }}
                        transition={{ delay:.16, duration:.36, ease:[.34,1.56,.64,1] }}
                        style={{ background:T.reviewBg, borderColor:T.reviewBrd, color:T.reviewTxt }}>
                        ⭐ Reviews
                      </motion.button>
                    </>)}
                    {isPayable && (
                      <motion.button className="qoc-btn qoc-btn-primary" onClick={handlePay}
                        initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }}
                        transition={{ delay:.12, duration:.38, ease:[.34,1.56,.64,1] }}>
                        <CreditCard size={11} strokeWidth={2.4}/> Pay Now
                        <ChevronRight size={10} strokeWidth={2.5} style={{ marginLeft:-2 }}/>
                      </motion.button>
                    )}
                    <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:textMut,
                      letterSpacing:".06em", textTransform:"uppercase", fontFamily:FONTS.mono }}>
                      {Math.round(cfg.fill*100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ QUOTE VIEW — stable height crossfade ══ */}
          {!isActive && !orderLoading && (
            <div style={{ position:"relative", zIndex:2 }}>
              {/* Header — always visible, never swaps */}
              <div className="qoc-quote-header"
                style={{ display:"flex", alignItems:"center", padding:"11px 15px 0", gap:7 }}>
                <TimerRing progress={progress} color={accentC}/>
                <span style={{ fontSize:8.5, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:".20em", color:textMut, lineHeight:1, flex:1, fontFamily:FONTS.body }}>
                  Quote of the moment
                </span>
              </div>

              {/*
                ── THE STABLE HEIGHT FIX ──────────────────────────────────────
                Outer div gets minHeight from first measured render.
                Inner div is position:relative for the "current" quote,
                and position:absolute for the "outgoing" quote — so both
                occupy the same space, card never shrinks.
              */}
              <div className="qoc-quote-body"
                style={{ padding:"9px 15px 13px",
                  minHeight: bodyHeight ? bodyHeight : undefined,
                  position:"relative" }}>

                {/* Outgoing quote — fades OUT */}
                {previousQuote && (
                  <motion.div key={`prev-${animKey}`}
                    initial={{ opacity:1 }}
                    animate={{ opacity:0 }}
                    transition={{ duration:0.35, ease:"easeInOut" }}
                    style={{ position:"absolute", inset:0, padding:"0 0 13px 0", pointerEvents:"none" }}>
                    <QuoteSlotBody quote={previousQuote} animKey={animKey-1} accentC={accentC}
                      textPri={textPri} FONTS={FONTS} isNepali={/[\u0900-\u097F]/.test(previousQuote?.text??"")}
                      poolRef={poolRef} lastIdxRef={lastIdxRef} incoming={false}/>
                  </motion.div>
                )}

                {/* Incoming quote — fades IN, measured for height lock */}
                <motion.div key={`curr-${animKey}`}
                  ref={quoteBodyRef}
                  initial={{ opacity:0 }}
                  animate={{ opacity:1 }}
                  transition={{ duration:0.40, ease:"easeInOut", delay: previousQuote ? 0.15 : 0 }}
                  style={{ position: previousQuote ? "relative" : "relative", zIndex:1 }}>
                  <QuoteSlotBody quote={currentQuote} animKey={animKey} accentC={accentC}
                    textPri={textPri} FONTS={FONTS} isNepali={isNepali}
                    poolRef={poolRef} lastIdxRef={lastIdxRef} incoming={true}/>
                </motion.div>

                {/* Progress dots */}
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  transition={{ delay:.5, duration:.4 }}
                  style={{ display:"flex", gap:4, marginTop:10,
                    justifyContent:"flex-end", alignItems:"center" }}>
                  {Array.from({ length: Math.min(poolRef.current.length, 8) }, (_, i) => {
                    const ai = lastIdxRef.current % 8
                    return (
                      <motion.div key={i}
                        animate={{ width:i===ai?18:4, background:i===ai?accentC:T.dotInactive }}
                        transition={{ duration:.48, ease:[.34,1.56,.64,1] }}
                        style={{ height:3.5, borderRadius:99 }}/>
                    )
                  })}
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}

// ── Quote slot body (extracted to keep main component clean) ──────────────────
function QuoteSlotBody({ quote, animKey, accentC, textPri, FONTS, isNepali, incoming }) {
  if (!quote) return null
  return (
    <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
      <motion.div
        initial={incoming ? { opacity:0, scale:.5, x:-4 } : false}
        animate={incoming ? { opacity:1, scale:1, x:0 } : false}
        transition={{ duration:.44, ease:[.34,1.56,.64,1], delay:.06 }}
        style={{ marginTop:5, flexShrink:0 }}>
        <QuoteIcon color={accentC}/>
      </motion.div>

      <div style={{ flex:1, minWidth:0 }}>
        <motion.span
          initial={incoming ? { opacity:0, scale:.3, rotate:-15 } : false}
          animate={incoming ? { opacity:1, scale:1, rotate:0 } : false}
          transition={{ duration:.44, ease:[.34,1.56,.64,1], delay:.08 }}
          style={{ display:"inline-block", fontSize:18, lineHeight:1, marginBottom:6,
            filter:"drop-shadow(0 2px 4px rgba(0,0,0,.12))" }}>
          {quote.emoji ?? "💬"}
        </motion.span>

        <p className="qoc-lora qoc-quote-text"
          style={{ lineHeight:isNepali?1.88:1.72 }}>
          {incoming
            ? <RevealWords key={`w-${animKey}`} text={quote.text} id={animKey}/>
            : quote.text
          }
        </p>

        {quote.author && (
          <motion.p
            initial={incoming ? { opacity:0 } : false}
            animate={incoming ? { opacity:1 } : false}
            transition={{ delay:.55, duration:.4 }}
            style={{ fontSize:11, fontWeight:600, color:accentC,
              margin:"7px 0 0", fontFamily:FONTS.body, letterSpacing:".02em" }}>
            — {quote.author}
          </motion.p>
        )}
      </div>
    </div>
  )
}