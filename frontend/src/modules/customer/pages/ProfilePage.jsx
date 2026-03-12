// src/modules/customer/pages/ProfilePage.jsx
// ═══════════════════════════════════════════════════════════════════════════
//  कौसी चिया — Profile Page
//  Full user info · username & avatar edit · dark/light mode
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useContext, useCallback } from 'react'
import { createPortal }            from 'react-dom'
import { useDispatch, useSelector }from 'react-redux'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Star, Edit3, Check, X,
  ChevronRight, ShieldCheck, Clock, Award,
  AlertTriangle, Package
}                                  from 'lucide-react'

import { selectUser, selectIsGuest, updateUser } from '@store/slices/authSlice'
import { selectLoyalty }           from '@store/slices/loyaltySlice'
import { selectOrderHistory, selectOrderLoading, fetchOrderHistory }
                                   from '@store/slices/orderSlice'
import { ThemeContext }            from '@shared/context/ThemeContext'
import BottomNav                   from '@shared/components/layout/BottomNav'
import LogoutButton                from '../components/profile/LogoutButton'
import { COLORS }                  from '@colors'
import api                         from '@api/axios'
import { ENDPOINTS as EP }         from '@api/endpoints'

// ── Constants ────────────────────────────────────────────────────────────────
const TIER_META = {
  bronze: { emoji: '🥉', label: 'Bronze', next: 'Silver', gradient: 'linear-gradient(135deg, #CD7F32, #E8A96A)' },
  silver: { emoji: '🥈', label: 'Silver', next: 'Gold',   gradient: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)' },
  gold:   { emoji: '🥇', label: 'Gold',   next: null,     gradient: 'linear-gradient(135deg, #F59E0B, #FCD34D)' },
  none:   { emoji: '☕', label: 'Member', next: 'Bronze', gradient: 'linear-gradient(135deg, #FF9F1C, #E05C2A)' },
}

const ORDER_STATUS_META = {
  pending:    { label: 'Pending',   color: '#D97706', bg: '#FFFBEB' },
  preparing:  { label: 'Preparing', color: '#2563EB', bg: '#EFF6FF' },
  on_the_way: { label: 'On Way',   color: '#7C3AED', bg: '#EDE9FE' },
  delivered:  { label: 'Delivered', color: '#16A34A', bg: '#F0FDF4' },
  paid:       { label: 'Paid',      color: '#059669', bg: '#D4F0E0' },
  cancelled:  { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
}

const POINTS_FOR_TIER = { bronze: 0, silver: 500, gold: 1500 }

const fmt = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })

const initials = (name) =>
  (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// ════════════════════════════════════════════════════════════════════════════
//  ConfirmModal
// ════════════════════════════════════════════════════════════════════════════
const ConfirmModal = ({ isDark, oldUsername, newUsername, onConfirm, onCancel, saving }) =>
  createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0,  opacity: 1, scale: 1    }}
        exit={{    y: 60, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{
          background: isDark ? '#1A1208' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,159,28,0.12)' : '#F0D9B5'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#FFF3DC' }}>
            <ShieldCheck size={28} color="#FF9F1C" />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold"
            style={{ color: isDark ? '#FFF8EE' : '#5C3317' }}>
            Change Username?
          </h3>
          <p className="text-sm" style={{ color: isDark ? '#C49A6C' : '#8B5E3C' }}>
            You're changing your login handle from
          </p>
          <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
            <span className="font-mono text-sm px-3 py-1.5 rounded-xl font-bold"
              style={{
                background: isDark ? '#241810' : '#FFF0D6',
                color: isDark ? '#C49A6C' : '#8B5E3C',
              }}>
              @{oldUsername || 'none'}
            </span>
            <span style={{ color: '#FF9F1C' }}>→</span>
            <span className="font-mono text-sm px-3 py-1.5 rounded-xl font-bold"
              style={{ background: '#FFF3DC', color: '#E08800' }}>
              @{newUsername}
            </span>
          </div>
          <p className="text-xs" style={{ color: isDark ? '#C49A6C' : '#8B5E3C' }}>
            This will update your login credentials.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: isDark ? '#241810' : '#FFF0D6',
              color: isDark ? '#C49A6C' : '#8B5E3C',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(255,159,28,0.35)',
            }}
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
              />
            ) : (
              <><Check size={15} /> Confirm</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )

// ════════════════════════════════════════════════════════════════════════════
//  Avatar definitions — 10 illustrated characters
// ════════════════════════════════════════════════════════════════════════════
const AVATARS = [
  {
    id: 'the_regular',
    label: 'The Regular',
    bg: 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
    svg: (
      // Chill dude, backwards cap, coffee in hand — comes every day
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body */}
        <ellipse cx="32" cy="54" rx="14" ry="8" fill="#E05C2A"/>
        <rect x="20" y="44" width="24" height="14" rx="6" fill="#E05C2A"/>
        {/* hoodie pocket */}
        <rect x="26" y="50" width="12" height="6" rx="3" fill="#C44A1A"/>
        {/* neck */}
        <rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="30" r="14" fill="#FDDCB5"/>
        {/* backwards cap brim */}
        <ellipse cx="32" cy="17" rx="13" ry="3.5" fill="#5C3317"/>
        {/* cap body going back */}
        <path d="M19 17 Q20 10 32 10 Q44 10 45 17" fill="#5C3317"/>
        {/* cap strap in front */}
        <rect x="26" y="15" width="12" height="4" rx="2" fill="#3D2010"/>
        {/* eyes — half-lidded, chill */}
        <path d="M25 29 Q27 27 29 29" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M35 29 Q37 27 39 29" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* slight smirk */}
        <path d="M28 35 Q32 38 36 35" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {/* coffee cup in hand */}
        <rect x="44" y="42" width="8" height="10" rx="2" fill="#fff"/>
        <rect x="44" y="42" width="8" height="3" rx="1" fill="#FF9F1C"/>
        <path d="M52 46 Q55 46 55 49 Q55 52 52 52" stroke="#E05C2A" strokeWidth="1.5" fill="none"/>
        {/* steam */}
        <path d="M46 40 Q47 37 46 34" stroke="#C49A6C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
        <path d="M50 39 Q51 36 50 33" stroke="#C49A6C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
  },
  {
    id: 'bookworm',
    label: 'The Bookworm',
    bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    svg: (
      // Big glasses, bun hair, book tucked under arm
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body */}
        <rect x="20" y="44" width="24" height="14" rx="6" fill="#7C3AED"/>
        {/* book under arm */}
        <rect x="42" y="46" width="10" height="14" rx="2" fill="#A78BFA"/>
        <rect x="42" y="46" width="2" height="14" rx="1" fill="#6D28D9"/>
        <line x1="44" y1="50" x2="52" y2="50" stroke="#DDD6FE" strokeWidth="0.8"/>
        <line x1="44" y1="53" x2="52" y2="53" stroke="#DDD6FE" strokeWidth="0.8"/>
        <line x1="44" y1="56" x2="52" y2="56" stroke="#DDD6FE" strokeWidth="0.8"/>
        {/* neck */}
        <rect x="28" y="38" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="29" r="14" fill="#FDDCB5"/>
        {/* hair bun */}
        <path d="M20 26 Q20 14 32 14 Q44 14 44 26" fill="#5C3317"/>
        <circle cx="32" cy="14" r="5" fill="#5C3317"/>
        <circle cx="32" cy="11" r="3" fill="#3D2010"/>
        {/* big round glasses */}
        <rect x="21" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/>
        <rect x="34" y="27" width="9" height="7" rx="3.5" fill="none" stroke="#5C3317" strokeWidth="2"/>
        <line x1="30" y1="30.5" x2="34" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        <line x1="19" y1="30" x2="21" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        <line x1="45" y1="30" x2="43" y2="30.5" stroke="#5C3317" strokeWidth="1.5"/>
        {/* eyes behind glasses */}
        <circle cx="25.5" cy="30.5" r="1.5" fill="#5C3317"/>
        <circle cx="38.5" cy="30.5" r="1.5" fill="#5C3317"/>
        {/* focused smile */}
        <path d="M28 37 Q32 39 36 37" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'workaholic',
    label: 'The Workaholic',
    bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    svg: (
      // Laptop open, tie, dark circles, stressed but smiling
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* laptop base */}
        <rect x="10" y="50" width="44" height="5" rx="2" fill="#374151"/>
        <rect x="14" y="38" width="36" height="14" rx="2" fill="#1F2937"/>
        {/* laptop screen glow */}
        <rect x="16" y="40" width="32" height="10" rx="1" fill="#1D4ED8"/>
        <rect x="18" y="41" width="10" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.7"/>
        <rect x="18" y="44" width="16" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.5"/>
        <rect x="18" y="47" width="8" height="1.5" rx="0.5" fill="#93C5FD" opacity="0.4"/>
        {/* body / shirt */}
        <rect x="22" y="28" width="20" height="12" rx="4" fill="#DBEAFE"/>
        {/* tie */}
        <polygon points="32,30 30,36 32,38 34,36" fill="#2563EB"/>
        <polygon points="31,28 33,28 32,31" fill="#1D4ED8"/>
        {/* neck */}
        <rect x="28" y="22" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="16" r="12" fill="#FDDCB5"/>
        {/* messy hair */}
        <path d="M20 14 Q22 6 32 6 Q42 6 44 14" fill="#374151"/>
        <path d="M20 14 Q19 10 22 8" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
        <path d="M44 14 Q45 10 42 8" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
        {/* tired eyes with dark circles */}
        <ellipse cx="27" cy="16" rx="3.5" ry="2.5" fill="#E5E7EB" opacity="0.6"/>
        <ellipse cx="37" cy="16" rx="3.5" ry="2.5" fill="#E5E7EB" opacity="0.6"/>
        <circle cx="27" cy="16" r="2" fill="#374151"/>
        <circle cx="37" cy="16" r="2" fill="#374151"/>
        <circle cx="27.7" cy="15.3" r="0.6" fill="white"/>
        <circle cx="37.7" cy="15.3" r="0.6" fill="white"/>
        {/* dark circles */}
        <path d="M24 19 Q27 21 30 19" stroke="#9CA3AF" strokeWidth="1" opacity="0.5" fill="none"/>
        <path d="M34 19 Q37 21 40 19" stroke="#9CA3AF" strokeWidth="1" opacity="0.5" fill="none"/>
        {/* determined smile */}
        <path d="M28 21 Q32 24 36 21" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'foodie',
    label: 'The Foodie',
    bg: 'linear-gradient(135deg, #E05C2A, #C44A1A)',
    svg: (
      // Big smile, fork in hand, little heart eyes, bib
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body */}
        <rect x="20" y="42" width="24" height="16" rx="6" fill="#FDE8DF"/>
        {/* bib */}
        <path d="M24 42 Q32 38 40 42 L38 54 Q32 56 26 54 Z" fill="white"/>
        <ellipse cx="32" cy="44" rx="5" ry="3" fill="#FDE8DF"/>
        {/* bib text decoration */}
        <circle cx="32" cy="48" r="2" fill="#FF9F1C"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="27" r="15" fill="#FDDCB5"/>
        {/* hair */}
        <path d="M17 24 Q18 14 32 13 Q46 14 47 24" fill="#92400E"/>
        {/* heart eyes */}
        <path d="M23 25 Q23 22 25 22 Q27 22 27 25 Q27 22 29 22 Q31 22 31 25 Q31 27 27 30 Q23 27 23 25Z" fill="#E05C2A"/>
        <path d="M33 25 Q33 22 35 22 Q37 22 37 25 Q37 22 39 22 Q41 22 41 25 Q41 27 37 30 Q33 27 33 25Z" fill="#E05C2A"/>
        {/* big happy smile */}
        <path d="M24 33 Q32 40 40 33" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M24 33 Q32 40 40 33" fill="#FF9F1C" opacity="0.3"/>
        {/* rosy cheeks */}
        <circle cx="22" cy="31" r="3.5" fill="#FCA5A5" opacity="0.6"/>
        <circle cx="42" cy="31" r="3.5" fill="#FCA5A5" opacity="0.6"/>
        {/* fork */}
        <line x1="52" y1="14" x2="52" y2="30" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="14" x2="50" y2="20" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="54" y1="14" x2="54" y2="20" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M50 20 Q50 24 52 24 Q54 24 54 20" fill="#9CA3AF"/>
      </svg>
    ),
  },
  {
    id: 'hipster',
    label: 'The Hipster',
    bg: 'linear-gradient(135deg, #2D9B5A, #1E7A42)',
    svg: (
      // Beanie, beard, flannel, aesthetic coffee snob
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body / flannel */}
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#2D9B5A"/>
        {/* flannel pattern */}
        <line x1="18" y1="46" x2="46" y2="46" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <line x1="18" y1="50" x2="46" y2="50" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <line x1="28" y1="42" x2="28" y2="58" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        <line x1="36" y1="42" x2="36" y2="58" stroke="#1E7A42" strokeWidth="1.5" opacity="0.5"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="28" r="14" fill="#FDDCB5"/>
        {/* beard */}
        <path d="M19 30 Q20 40 32 42 Q44 40 45 30 Q40 36 32 36 Q24 36 19 30Z" fill="#5C3317"/>
        {/* moustache */}
        <path d="M26 30 Q29 33 32 30 Q35 33 38 30" stroke="#3D2010" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* beanie */}
        <path d="M18 24 Q20 13 32 12 Q44 13 46 24" fill="#E05C2A"/>
        <rect x="17" y="22" width="30" height="5" rx="2.5" fill="#C44A1A"/>
        <circle cx="32" cy="12" r="4" fill="#FF9F1C"/>
        {/* eyes — lidded, cool */}
        <circle cx="27" cy="27" r="2.5" fill="#5C3317"/>
        <circle cx="37" cy="27" r="2.5" fill="#5C3317"/>
        <path d="M24 25 Q27 23 30 25" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M34 25 Q37 23 40 25" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="27.8" cy="26.5" r="0.7" fill="white"/>
        <circle cx="37.8" cy="26.5" r="0.7" fill="white"/>
      </svg>
    ),
  },
  {
    id: 'socialite',
    label: 'The Socialite',
    bg: 'linear-gradient(135deg, #EC4899, #BE185D)',
    svg: (
      // Glam, sunglasses on head, big earrings, bright lipstick
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body */}
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#FBCFE8"/>
        {/* sparkle dress detail */}
        <circle cx="26" cy="48" r="1.2" fill="#EC4899"/>
        <circle cx="32" cy="46" r="1.2" fill="#EC4899"/>
        <circle cx="38" cy="49" r="1.2" fill="#EC4899"/>
        <circle cx="30" cy="52" r="1" fill="#BE185D"/>
        <circle cx="36" cy="53" r="1" fill="#BE185D"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* earrings */}
        <circle cx="18" cy="30" r="2" fill="#F59E0B"/>
        <circle cx="18" cy="34" r="1.5" fill="#EC4899"/>
        <line x1="18" y1="30" x2="18" y2="34" stroke="#F59E0B" strokeWidth="1"/>
        <circle cx="46" cy="30" r="2" fill="#F59E0B"/>
        <circle cx="46" cy="34" r="1.5" fill="#EC4899"/>
        <line x1="46" y1="30" x2="46" y2="34" stroke="#F59E0B" strokeWidth="1"/>
        {/* head */}
        <circle cx="32" cy="26" r="14" fill="#FDDCB5"/>
        {/* wavy hair */}
        <path d="M18 22 Q18 10 32 10 Q46 10 46 22 Q42 18 38 22 Q35 16 32 20 Q29 16 26 22 Q22 18 18 22Z" fill="#92400E"/>
        <path d="M18 22 Q16 28 17 34" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
        <path d="M46 22 Q48 28 47 34" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
        {/* sunglasses pushed up on head */}
        <rect x="23" y="13" width="8" height="4" rx="2" fill="#1C1917" opacity="0.8"/>
        <rect x="33" y="13" width="8" height="4" rx="2" fill="#1C1917" opacity="0.8"/>
        <line x1="31" y1="15" x2="33" y2="15" stroke="#374151" strokeWidth="1.5"/>
        {/* eyes — with lashes */}
        <circle cx="27" cy="25" r="2.5" fill="#5C3317"/>
        <circle cx="37" cy="25" r="2.5" fill="#5C3317"/>
        <circle cx="27.8" cy="24.2" r="0.8" fill="white"/>
        <circle cx="37.8" cy="24.2" r="0.8" fill="white"/>
        {/* lashes */}
        <line x1="25" y1="22.5" x2="24" y2="21" stroke="#1C1917" strokeWidth="1" strokeLinecap="round"/>
        <line x1="27" y1="22" x2="27" y2="20.5" stroke="#1C1917" strokeWidth="1" strokeLinecap="round"/>
        <line x1="29" y1="22.5" x2="30" y2="21" stroke="#1C1917" strokeWidth="1" strokeLinecap="round"/>
        <line x1="35" y1="22.5" x2="34" y2="21" stroke="#1C1917" strokeWidth="1" strokeLinecap="round"/>
        <line x1="37" y1="22" x2="37" y2="20.5" stroke="#1C1917" strokeWidth="1" strokeLinecap="round"/>
        <line x1="39" y1="22.5" x2="40" y2="21" stroke="#1C1917" strokeWidth="1" strokeLinecap="round"/>
        {/* lipstick smile */}
        <path d="M28 31 Q32 35 36 31" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <ellipse cx="32" cy="32" rx="4" ry="1.5" fill="#EC4899" opacity="0.4"/>
        {/* rosy cheeks */}
        <circle cx="22" cy="29" r="3" fill="#FCA5A5" opacity="0.5"/>
        <circle cx="42" cy="29" r="3" fill="#FCA5A5" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'student',
    label: 'The Student',
    bg: 'linear-gradient(135deg, #0EA5E9, #0369A1)',
    svg: (
      // Graduation cap, backpack strap, sleepy but caffeinated
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* backpack strap */}
        <rect x="12" y="38" width="5" height="18" rx="2.5" fill="#0369A1"/>
        <rect x="47" y="38" width="5" height="18" rx="2.5" fill="#0369A1"/>
        {/* body */}
        <rect x="17" y="42" width="30" height="16" rx="6" fill="#BAE6FD"/>
        {/* backpack body behind */}
        <rect x="15" y="36" width="34" height="22" rx="5" fill="#0284C7" opacity="0.4"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        {/* grad cap */}
        <rect x="20" y="17" width="24" height="5" rx="1" fill="#1C1917"/>
        <polygon points="32,10 44,17 32,20 20,17" fill="#374151"/>
        <line x1="44" y1="17" x2="46" y2="24" stroke="#1C1917" strokeWidth="1.5"/>
        <circle cx="46" cy="25" r="2" fill="#F59E0B"/>
        {/* sleepy eyes — one half closed */}
        <circle cx="27" cy="27" r="2.5" fill="#374151"/>
        <circle cx="37" cy="27" r="2.5" fill="#374151"/>
        {/* heavy eyelids */}
        <path d="M24 26 Q27 24.5 30 26" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M34 26 Q37 24.5 40 26" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="27.5" cy="27.5" r="0.7" fill="white"/>
        <circle cx="37.5" cy="27.5" r="0.7" fill="white"/>
        {/* tired smile */}
        <path d="M28 33 Q32 35 36 33" stroke="#5C3317" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {/* dark circles */}
        <ellipse cx="27" cy="30" rx="3" ry="1.5" fill="#BAE6FD" opacity="0.4"/>
        <ellipse cx="37" cy="30" rx="3" ry="1.5" fill="#BAE6FD" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 'elder',
    label: 'The Elder',
    bg: 'linear-gradient(135deg, #92400E, #78350F)',
    svg: (
      // Wise old regular, newspaper, reading glasses low on nose, warm smile
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body / cardigan */}
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#D97706"/>
        {/* cardigan buttons */}
        <circle cx="32" cy="46" r="1.2" fill="#92400E"/>
        <circle cx="32" cy="50" r="1.2" fill="#92400E"/>
        <circle cx="32" cy="54" r="1.2" fill="#92400E"/>
        {/* newspaper */}
        <rect x="42" y="44" width="12" height="14" rx="2" fill="#F9FAFB"/>
        <line x1="44" y1="47" x2="52" y2="47" stroke="#9CA3AF" strokeWidth="1"/>
        <line x1="44" y1="50" x2="52" y2="50" stroke="#9CA3AF" strokeWidth="0.8"/>
        <line x1="44" y1="53" x2="50" y2="53" stroke="#9CA3AF" strokeWidth="0.8"/>
        <rect x="44" y="56" width="4" height="0.8" rx="0.4" fill="#D1D5DB"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        {/* white/grey hair wisps */}
        <path d="M18 23 Q20 13 32 13 Q44 13 46 23" fill="#E5E7EB"/>
        <path d="M18 23 Q17 19 20 16" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round"/>
        <path d="M46 23 Q47 19 44 16" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round"/>
        {/* reading glasses low on nose */}
        <rect x="23" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/>
        <rect x="34" y="29" width="7" height="5" rx="2.5" fill="none" stroke="#92400E" strokeWidth="1.8"/>
        <line x1="30" y1="31.5" x2="34" y2="31.5" stroke="#92400E" strokeWidth="1.5"/>
        {/* eyes above glasses */}
        <circle cx="26.5" cy="25" r="2" fill="#5C3317"/>
        <circle cx="37.5" cy="25" r="2" fill="#5C3317"/>
        <circle cx="27.2" cy="24.3" r="0.6" fill="white"/>
        <circle cx="38.2" cy="24.3" r="0.6" fill="white"/>
        {/* warm wrinkle smile */}
        <path d="M26 35 Q32 39 38 35" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* smile lines */}
        <path d="M24 33 Q22 35 24 37" stroke="#C49A6C" strokeWidth="1" opacity="0.5" fill="none"/>
        <path d="M40 33 Q42 35 40 37" stroke="#C49A6C" strokeWidth="1" opacity="0.5" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'sporty',
    label: 'The Sporty One',
    bg: 'linear-gradient(135deg, #16A34A, #15803D)',
    svg: (
      // Sporty cap, sweatband, energy drink or protein bar
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body / sports jersey */}
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#16A34A"/>
        {/* jersey number */}
        <text x="32" y="54" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="monospace">7</text>
        {/* sweatband on wrist */}
        <rect x="44" y="48" width="8" height="5" rx="2.5" fill="#FBBF24"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        {/* sweatband on head */}
        <rect x="18" y="24" width="28" height="5" rx="2.5" fill="#FBBF24"/>
        {/* sports cap visor */}
        <path d="M18 24 Q20 14 32 13 Q44 14 46 24" fill="#15803D"/>
        {/* cap button */}
        <circle cx="32" cy="13" r="2" fill="#16A34A"/>
        {/* energetic wide eyes */}
        <circle cx="27" cy="28" r="3" fill="white"/>
        <circle cx="37" cy="28" r="3" fill="white"/>
        <circle cx="27" cy="28" r="2" fill="#15803D"/>
        <circle cx="37" cy="28" r="2" fill="#15803D"/>
        <circle cx="27.8" cy="27.2" r="0.8" fill="white"/>
        <circle cx="37.8" cy="27.2" r="0.8" fill="white"/>
        {/* big confident grin */}
        <path d="M25 34 Q32 40 39 34" stroke="#5C3317" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* rosy sport flush */}
        <circle cx="22" cy="32" r="3" fill="#FCA5A5" opacity="0.4"/>
        <circle cx="42" cy="32" r="3" fill="#FCA5A5" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 'artist',
    label: 'The Artist',
    bg: 'linear-gradient(135deg, #F59E0B, #92400E)',
    svg: (
      // Paint smudge on face, beret, creative messy vibe
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* body / smock */}
        <rect x="18" y="42" width="28" height="16" rx="6" fill="#FEF3C7"/>
        {/* paint smudges on smock */}
        <ellipse cx="26" cy="48" rx="3" ry="2" fill="#EC4899" opacity="0.6" transform="rotate(-15 26 48)"/>
        <ellipse cx="36" cy="51" rx="3" ry="2" fill="#2563EB" opacity="0.5" transform="rotate(10 36 51)"/>
        <ellipse cx="30" cy="55" rx="2.5" ry="1.5" fill="#16A34A" opacity="0.5"/>
        {/* paintbrush in hand */}
        <line x1="48" y1="38" x2="56" y2="28" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>
        <ellipse cx="47" cy="39" rx="3" ry="2" fill="#F59E0B" transform="rotate(-45 47 39)"/>
        <circle cx="56" cy="27" r="2.5" fill="#EC4899"/>
        {/* neck */}
        <rect x="28" y="36" width="8" height="8" rx="3" fill="#FDDCB5"/>
        {/* head */}
        <circle cx="32" cy="27" r="14" fill="#FDDCB5"/>
        {/* beret */}
        <ellipse cx="32" cy="16" rx="14" ry="6" fill="#92400E"/>
        <ellipse cx="32" cy="15" rx="10" ry="7" fill="#B45309"/>
        <circle cx="38" cy="12" r="2.5" fill="#92400E"/>
        {/* paint smudge on cheek */}
        <ellipse cx="23" cy="32" rx="3" ry="2" fill="#2563EB" opacity="0.4" transform="rotate(-10 23 32)"/>
        {/* dreamy eyes */}
        <circle cx="27" cy="26" r="2.5" fill="#92400E"/>
        <circle cx="37" cy="26" r="2.5" fill="#92400E"/>
        <circle cx="27.8" cy="25.2" r="0.8" fill="white"/>
        <circle cx="37.8" cy="25.2" r="0.8" fill="white"/>
        {/* slightly open mouth — inspired */}
        <path d="M28 33 Q32 37 36 33" stroke="#5C3317" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <ellipse cx="32" cy="34" rx="3" ry="1.5" fill="#FCA5A5" opacity="0.3"/>
        {/* star sparkle near eye */}
        <path d="M41 22 L42 20 L43 22 L45 23 L43 24 L42 26 L41 24 L39 23 Z" fill="#F59E0B" opacity="0.8"/>
      </svg>
    ),
  },
]

// ════════════════════════════════════════════════════════════════════════════
//  AvatarPicker — shown in a bottom sheet portal
// ════════════════════════════════════════════════════════════════════════════
const AvatarPicker = ({ isDark, current, onSelect, onClose }) =>
  createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-5"
        style={{
          background: isDark ? '#1A1208' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,159,28,0.12)' : '#F0D9B5'}`,
          borderBottom: 'none',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center -mt-2">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,159,28,0.2)' : '#F0D9B5' }} />
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: isDark ? '#FFF8EE' : '#5C3317' }}>
            Choose Avatar
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: isDark ? '#241810' : '#FFF0D6' }}>
            <X size={14} color={isDark ? '#C49A6C' : '#8B5E3C'} />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {AVATARS.map((av) => {
            const isSelected = current === av.id
            return (
              <motion.button
                key={av.id}
                whileTap={{ scale: 0.88 }}
                onClick={() => onSelect(av.id)}
                className="relative flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-full aspect-square rounded-2xl overflow-hidden p-0.5"
                  style={{
                    background: av.bg,
                    boxShadow: isSelected
                      ? '0 0 0 3px #FF9F1C, 0 4px 16px rgba(255,159,28,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.12)',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {av.svg}
                </div>
                <span className="text-[9px] font-semibold text-center leading-tight w-full"
                  style={{ color: isSelected ? '#FF9F1C' : (isDark ? '#C49A6C' : '#8B5E3C') }}>
                  {av.label}
                </span>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#FF9F1C', border: `2px solid ${isDark ? '#1A1208' : '#fff'}` }}
                  >
                    <Check size={9} color="white" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )

// ════════════════════════════════════════════════════════════════════════════
//  AvatarEditor — shows current avatar + edit button
// ════════════════════════════════════════════════════════════════════════════
const AvatarEditor = ({ user, isDark, onAvatarChange, saving }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const currentId = user?.avatar || null
  const currentAv = AVATARS.find((a) => a.id === currentId)

  const handleSelect = (id) => {
    setPickerOpen(false)
    onAvatarChange(id)
  }

  return (
    <>
      <div className="relative w-20 h-20 flex-shrink-0">
        <div
          className="w-20 h-20 rounded-[22px] overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
          style={{
            background: currentAv ? currentAv.bg : 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
            boxShadow: '0 4px 20px rgba(255,159,28,0.35)',
            padding: currentAv ? '2px' : 0,
          }}
        >
          {currentAv ? currentAv.svg : <span>{initials(user?.name)}</span>}
        </div>

        {saving && (
          <div className="absolute inset-0 rounded-[22px] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-white border-t-transparent"
            />
          </div>
        )}

        <button
          onClick={() => setPickerOpen(true)}
          disabled={saving}
          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
            border: `2.5px solid ${isDark ? '#1A1208' : '#fff'}`,
          }}
        >
          <Edit3 size={12} color="#fff" />
        </button>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <AvatarPicker
            isDark={isDark}
            current={currentId}
            onSelect={handleSelect}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  LoyaltyBar
// ════════════════════════════════════════════════════════════════════════════
const LoyaltyBar = ({ tier, points, isDark }) => {
  const meta     = TIER_META[tier] || TIER_META.bronze
  const nextTier = meta.next?.toLowerCase()
  const max      = nextTier ? POINTS_FOR_TIER[nextTier] : POINTS_FOR_TIER.gold
  const base     = POINTS_FOR_TIER[tier] || 0
  const pct      = nextTier ? Math.min(100, ((points - base) / (max - base)) * 100) : 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="text-xs font-semibold"
          style={{ color: isDark ? '#C49A6C' : '#8B5E3C' }}>
          {nextTier ? `${points} / ${max} pts to ${meta.next}` : 'Max tier reached 🎉'}
        </span>
        <span className="text-xs font-bold" style={{ color: '#FF9F1C' }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden"
        style={{ background: isDark ? '#241810' : '#FFE4B5' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: meta.gradient }}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  OrderItem
// ════════════════════════════════════════════════════════════════════════════
const OrderItem = ({ order, isDark }) => {
  const [open, setOpen] = useState(false)
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending

  return (
    <motion.div layout className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:opacity-70"
        style={{
          background: open
            ? (isDark ? 'rgba(36,24,16,0.8)' : 'rgba(255,240,214,0.5)')
            : 'transparent',
        }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: meta.bg }}>
          <Package size={16} color={meta.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold font-mono"
              style={{ color: isDark ? '#FFF8EE' : '#5C3317' }}>
              #{order._id.slice(-6).toUpperCase()}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: isDark ? '#C49A6C' : '#8B5E3C' }}>
            {fmt(order.createdAt)} · ₹{order.total}
            {order.items?.length > 0 && ` · ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <ChevronRight
          size={15}
          style={{
            color: isDark ? '#C49A6C' : '#8B5E3C',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="px-4 pb-3.5 space-y-2 overflow-hidden"
            style={{ background: isDark ? 'rgba(36,24,16,0.6)' : 'rgba(255,240,214,0.4)' }}
          >
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span style={{ color: isDark ? '#C49A6C' : '#8B5E3C' }}>
                  {item.emoji} {item.name}
                  {item.portion && <span className="opacity-60"> · {item.portion}</span>}
                  <span className="font-semibold"> ×{item.quantity}</span>
                </span>
                <span className="font-semibold font-mono"
                  style={{ color: isDark ? '#FFF8EE' : '#5C3317' }}>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
            {order.pointsEarned > 0 && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t"
                style={{ borderColor: isDark ? 'rgba(255,159,28,0.12)' : '#F0D9B5' }}>
                <Star size={11} fill="#FF9F1C" color="#FF9F1C" />
                <span className="text-xs font-bold" style={{ color: '#FF9F1C' }}>
                  +{order.pointsEarned} points earned
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const ProfilePage = () => {
  const dispatch    = useDispatch()
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const loyalty     = useSelector(selectLoyalty)
  const history     = useSelector(selectOrderHistory)
  const histLoading = useSelector(selectOrderLoading)
  const { isDark }  = useContext(ThemeContext)

  // Username edit
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameVal,     setUsernameVal]     = useState(user?.username || '')
  const [usernameErr,     setUsernameErr]     = useState('')
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [savedFlash,      setSavedFlash]      = useState(false)

  // Avatar
  const [avatarSaving, setAvatarSaving] = useState(false)

  useEffect(() => {
    if (!isGuest) dispatch(fetchOrderHistory())
  }, [dispatch, isGuest])

  useEffect(() => {
    setUsernameVal(user?.username || '')
  }, [user?.username])

  // Theme tokens
  const bg        = isDark ? '#0F0A06'               : '#FFF8EE'
  const surface   = isDark ? '#1A1208'               : '#FFFFFF'
  const surface2  = isDark ? '#241810'               : '#FFF0D6'
  const border    = isDark ? 'rgba(255,159,28,0.12)' : '#F0D9B5'
  const textMain  = isDark ? '#FFF8EE'               : '#5C3317'
  const textMuted = isDark ? '#C49A6C'               : '#8B5E3C'
  const headerBg  = isDark ? '#0F0A06E8'             : '#FFF8EEF0'

  const validateUsername = (val) => {
    if (!val)          return 'Username cannot be empty'
    if (val.length < 3)  return 'At least 3 characters'
    if (val.length > 20) return 'At most 20 characters'
    if (!/^[a-z0-9_]+$/.test(val)) return 'Letters, numbers, underscores only'
    if (val === user?.username) return 'Same as current username'
    return ''
  }

  const handleUsernameChange = (e) => {
    const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsernameVal(v)
    setUsernameErr(validateUsername(v))
  }

  const handleUsernameSave = () => {
    const err = validateUsername(usernameVal)
    if (err) { setUsernameErr(err); return }
    setShowConfirm(true)
  }

  const handleConfirmUsername = async () => {
    setSaving(true)
    try {
      const res = await api.patch(EP.AUTH.UPDATE_PROFILE, { username: usernameVal })
      dispatch(updateUser(res.data))
      setShowConfirm(false)
      setEditingUsername(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setUsernameErr(err.response?.data?.message || 'Failed to update')
      setShowConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = useCallback(async (avatarId) => {
    setAvatarSaving(true)
    try {
      const res = await api.patch(EP.AUTH.UPDATE_PROFILE, { avatar: avatarId })
      dispatch(updateUser(res.data))
    } catch {
      // silently fail — picker already shows selection optimistically
    } finally {
      setAvatarSaving(false)
    }
  }, [dispatch])

  const tier     = loyalty?.tier || 'bronze'
  const tierMeta = TIER_META[tier] || TIER_META.bronze
  const totalSpend = history.reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div className="customer-container min-h-screen flex flex-col" style={{ background: bg }}>

      {/* Header */}
      <header
        className="px-4 pt-5 pb-3 sticky top-0 z-20"
        style={{
          background: headerBg,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${border}`,
        }}
      >
        <h1 className="text-2xl font-bold" style={{ color: textMain }}>Profile</h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pt-4 pb-bottom-nav space-y-4">

        {/* ── User Card ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.38 }}
          className="rounded-3xl p-5 space-y-4"
          style={{ background: surface, border: `1px solid ${border}`, boxShadow: '0 2px 8px rgba(92,51,23,0.08)' }}
        >
          {/* Avatar + name row */}
          <div className="flex items-start gap-4">
            {!isGuest ? (
              <AvatarEditor
                user={user}
                isDark={isDark}
                onAvatarChange={handleAvatarChange}
                saving={avatarSaving}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-[22px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF9F1C, #E05C2A)', boxShadow: '0 4px 20px rgba(255,159,28,0.35)' }}
              >
                <User size={32} color="#fff" />
              </div>
            )}

            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl font-bold truncate" style={{ color: textMain }}>
                {isGuest ? 'Guest User' : user?.name}
              </h2>
              {!isGuest && user?.email && (
                <p className="text-sm truncate mt-0.5" style={{ color: textMuted }}>{user.email}</p>
              )}
              {isGuest && (
                <p className="text-sm mt-0.5" style={{ color: textMuted }}>Sign in to save history</p>
              )}
              {/* Role badge */}
              {!isGuest && user?.role && (
                <span
                  className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 capitalize"
                  style={{
                    background: isDark ? surface2 : '#FFF3DC',
                    color: '#FF9F1C',
                  }}
                >
                  {user.role}
                </span>
              )}

              {/* Saved flash */}
              <AnimatePresence>
                {savedFlash && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1 mt-1.5"
                  >
                    <Check size={12} color="#2D9B5A" />
                    <span className="text-xs font-semibold" style={{ color: '#2D9B5A' }}>Username updated!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Username editor ────────────────────────────────────── */}
          {!isGuest && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>
                  Username
                </span>
                {!editingUsername && (
                  <button
                    onClick={() => { setEditingUsername(true); setUsernameErr('') }}
                    className="flex items-center gap-1 text-xs font-semibold active:scale-95 transition-all"
                    style={{ color: '#FF9F1C' }}
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {editingUsername ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                          style={{ color: textMuted }}>@</span>
                        <input
                          value={usernameVal}
                          onChange={handleUsernameChange}
                          maxLength={20}
                          autoFocus
                          placeholder="your_handle"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-mono font-semibold outline-none"
                          style={{
                            background: surface2,
                            color: textMain,
                            border: `1.5px solid ${usernameErr ? '#DC2626' : '#FF9F1C'}`,
                          }}
                        />
                      </div>
                      <button
                        onClick={handleUsernameSave}
                        disabled={!!usernameErr || !usernameVal}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                        style={{
                          background: (usernameErr || !usernameVal)
                            ? (isDark ? surface2 : '#F0D9B5')
                            : 'linear-gradient(135deg, #FF9F1C, #E05C2A)',
                          opacity: (usernameErr || !usernameVal) ? 0.4 : 1,
                        }}
                      >
                        <Check size={16} color="#fff" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingUsername(false)
                          setUsernameVal(user?.username || '')
                          setUsernameErr('')
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                        style={{ background: surface2 }}
                      >
                        <X size={16} color={textMuted} />
                      </button>
                    </div>

                    {usernameErr && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5"
                      >
                        <AlertTriangle size={11} color="#DC2626" />
                        <p className="text-xs" style={{ color: '#DC2626' }}>{usernameErr}</p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span
                      className="font-mono text-sm font-bold px-3 py-1.5 rounded-xl inline-block"
                      style={{ background: surface2, color: textMain }}
                    >
                      @{user?.username || '—'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Avatar saving hint */}
          {avatarSaving && (
            <p className="text-xs text-center" style={{ color: textMuted }}>Saving photo…</p>
          )}
        </motion.div>

        {/* ── Loyalty Card ───────────────────────────────────────────── */}
        {!isGuest && (
          <motion.div
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.38, delay: 0.07 }}
            className="rounded-3xl p-5 space-y-4"
            style={{
              background: isDark
                ? '#1A1208'
                : ({ bronze: '#FDF3E7', silver: '#F9FAFB', gold: '#FFFBEB' }[tier] || '#FFF8EE'),
              border: `1px solid ${border}`,
              boxShadow: '0 2px 8px rgba(92,51,23,0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: isDark ? surface2 : 'rgba(255,255,255,0.6)' }}
                >
                  {tierMeta.emoji}
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: textMain }}>
                    {tierMeta.label} Member
                  </p>
                  <p className="text-xs" style={{ color: textMuted }}>
                    {(loyalty?.points || 0).toLocaleString()} points
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <Star size={14} fill="#FF9F1C" color="#FF9F1C" />
                  <span className="text-lg font-bold" style={{ color: '#FF9F1C' }}>
                    {loyalty?.discountPct || 0}%
                  </span>
                </div>
                <p className="text-xs" style={{ color: textMuted }}>discount</p>
              </div>
            </div>

            <LoyaltyBar tier={tier} points={loyalty?.points || 0} isDark={isDark} />
          </motion.div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────── */}
        {!isGuest && history.length > 0 && (
          <motion.div
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.38, delay: 0.13 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: Package, label: 'Orders', value: history.length,                          color: '#FF9F1C' },
              { icon: Award,   label: 'Points', value: (loyalty?.points || 0).toLocaleString(), color: '#2D9B5A' },
              { icon: Clock,   label: 'Spent',  value: `₹${totalSpend.toLocaleString()}`,       color: '#E05C2A' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label}
                className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5"
                style={{ background: surface, border: `1px solid ${border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <Icon size={18} color={color} />
                <p className="text-sm font-bold font-mono leading-tight" style={{ color: textMain }}>{value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Order History ──────────────────────────────────────────── */}
        {!isGuest && (
          <motion.div
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.38, delay: 0.18 }}
            className="rounded-3xl overflow-hidden"
            style={{ background: surface, border: `1px solid ${border}`, boxShadow: '0 2px 8px rgba(92,51,23,0.08)' }}
          >
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: textMain }}>Order History</h3>
              {history.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: surface2, color: textMuted }}>
                  {history.length}
                </span>
              )}
            </div>

            {histLoading ? (
              <div className="px-4 pb-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-2xl animate-pulse"
                    style={{ background: surface2 }} />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="px-4 pb-6 text-center space-y-1">
                <p className="text-2xl">😋</p>
                <p className="text-sm" style={{ color: textMuted }}>No past orders yet. Order something!</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: border }}>
                {history.map((order) => (
                  <OrderItem key={order._id} order={order} isDark={isDark} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Logout ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.38, delay: 0.24 }}
        >
          <LogoutButton />
        </motion.div>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            isDark={isDark}
            oldUsername={user?.username}
            newUsername={usernameVal}
            onConfirm={handleConfirmUsername}
            onCancel={() => setShowConfirm(false)}
            saving={saving}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}

export default ProfilePage