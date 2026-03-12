// backend/scripts/db/seed.js
// ─────────────────────────────────────────────────────────────────────────────
// कौसी चिया — Database Seed Script
// Seeds 20 menu items (7 drinks + 13 food with portions)
//
// Usage:
//   node scripts/db/seed.js
//   node scripts/db/seed.js --clear   ← drops existing cafe menu items first
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kausichiya'

// Cafe ID (must already exist in cafes collection)
const CAFE_ID = new mongoose.Types.ObjectId('6860cafe0000000000000001')

// Helper — valid 24-char hex IDs  e.g. ID(1) → '6860beef0000000000000001'
const ID = (n) => new mongoose.Types.ObjectId(`6860beef${String(n).padStart(16, '0')}`)

// Unsplash CDN helper — hand-picked photo IDs, 400×300, cropped centre
const IMG = (photoId) =>
  `https://images.unsplash.com/${photoId}?w=400&h=300&q=80&fit=crop&crop=center`

// ── Inline schema (avoids import-path issues in standalone script) ─────────────
const portionSchema = new mongoose.Schema(
  {
    id:        { type: String,  required: true },
    label:     { type: String,  required: true },
    price:     { type: Number,  required: true },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number,  default: 0 },
  },
  { _id: false }
)

const menuItemSchema = new mongoose.Schema(
  {
    cafeId:                 { type: mongoose.Schema.Types.ObjectId, required: true },
    name:                   { type: String,   required: true },
    description:            { type: String,   default: '' },
    price:                  { type: Number,   required: true },
    portions:               { type: [portionSchema], default: [] },
    category:               { type: String,   required: true },
    emoji:                  { type: String,   default: '' },
    image:                  { type: String,   default: '' },
    isAvailable:            { type: Boolean,  default: true },
    isFeatured:             { type: Boolean,  default: false },
    isVeg:                  { type: Boolean,  default: true },
    spiceLevel:             { type: Number,   default: 0, min: 0, max: 5 },
    preparationTimeMinutes: { type: Number,   default: 10 },
    allergens:              { type: [String], default: [] },
    tags:                   { type: [String], default: [] },
    sortOrder:              { type: Number,   default: 0 },
  },
  { timestamps: true }
)

const MenuItem = mongoose.model('MenuItem', menuItemSchema)

// ── Seed Data ─────────────────────────────────────────────────────────────────
const menuItems = [

  // ═══════════════════════════════════════════════════════
  //  DRINKS  (no portions — single price)
  // ═══════════════════════════════════════════════════════

  {
    _id:                    ID(1),
    cafeId:                 CAFE_ID,
    name:                   'Masala Chiya',
    description:            'Spiced Nepali milk tea with cardamom, ginger and cinnamon',
    price:                  80,
    portions:               [],
    category:               'hot_drinks',
    emoji:                  '☕',
    // Steaming masala chai with spices — exact match
    image:                  IMG('photo-1567922045116-2a00fae2ed03'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             1,
    preparationTimeMinutes: 5,
    allergens:              ['milk'],
    tags:                   ['bestseller'],
    sortOrder:              1,
  },

  {
    _id:                    ID(2),
    cafeId:                 CAFE_ID,
    name:                   'Black Coffee',
    description:            'Strong Nepali drip coffee, bold and aromatic',
    price:                  120,
    portions:               [],
    category:               'hot_drinks',
    emoji:                  '☕',
    // Black espresso in white cup on saucer
    image:                  IMG('photo-1509042239860-f550ce710b93'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 4,
    allergens:              [],
    tags:                   [],
    sortOrder:              2,
  },

  {
    _id:                    ID(3),
    cafeId:                 CAFE_ID,
    name:                   'Cold Coffee',
    description:            'Chilled blended coffee with milk and a hint of chocolate',
    price:                  160,
    portions:               [],
    category:               'cold_drinks',
    emoji:                  '🧋',
    // Iced coffee in tall glass with straw
    image:                  IMG('photo-1461023058943-07fcbe16d735'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 5,
    allergens:              ['milk'],
    tags:                   [],
    sortOrder:              3,
  },

  {
    _id:                    ID(4),
    cafeId:                 CAFE_ID,
    name:                   'Mango Lassi',
    description:            'Thick creamy yogurt drink blended with ripe Nepali mangoes',
    price:                  140,
    portions:               [],
    category:               'cold_drinks',
    emoji:                  '🥭',
    // Mango lassi yellow yogurt drink in glass
    image:                  IMG('photo-1570222094114-d054a817e56b'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 5,
    allergens:              ['milk'],
    tags:                   ['seasonal'],
    sortOrder:              4,
  },

  {
    _id:                    ID(5),
    cafeId:                 CAFE_ID,
    name:                   'Fresh Orange Juice',
    description:            'Freshly squeezed oranges, served chilled with no added sugar',
    price:                  130,
    portions:               [],
    category:               'fresh_juice',
    emoji:                  '🍊',
    // Fresh orange juice glass with orange halves
    image:                  IMG('photo-1600271886742-f049cd451bba'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 5,
    allergens:              [],
    tags:                   [],
    sortOrder:              5,
  },

  {
    _id:                    ID(6),
    cafeId:                 CAFE_ID,
    name:                   'Watermelon Mint Cooler',
    description:            'Blended watermelon with fresh mint and a squeeze of lime',
    price:                  150,
    portions:               [],
    category:               'fresh_juice',
    emoji:                  '🍉',
    // Watermelon juice with mint garnish
    image:                  IMG('photo-1497534446932-c925b458314e'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 5,
    allergens:              [],
    tags:                   ['seasonal'],
    sortOrder:              6,
  },

  {
    _id:                    ID(7),
    cafeId:                 CAFE_ID,
    name:                   'Banana Smoothie',
    description:            'Thick banana blended with cold milk, honey and a pinch of cinnamon',
    price:                  160,
    portions:               [],
    category:               'smoothies',
    emoji:                  '🍌',
    // Creamy banana smoothie in glass
    image:                  IMG('photo-1553530666-ba11a7da3888'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 5,
    allergens:              ['milk'],
    tags:                   [],
    sortOrder:              7,
  },

  // ═══════════════════════════════════════════════════════
  //  FOOD  (Half / Full portions)
  // ═══════════════════════════════════════════════════════

  {
    _id:                    ID(8),
    cafeId:                 CAFE_ID,
    name:                   'Veg Momo',
    description:            'Steamed dumplings stuffed with spiced vegetables and cheese',
    price:                  160,
    portions: [
      { id: 'half', label: 'Half Plate', price: 160, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full Plate', price: 280, isDefault: false, sortOrder: 1 },
    ],
    category:               'snacks',
    emoji:                  '🥟',
    // Steamed Asian dumplings in bamboo steamer — closest to momo
    image:                  IMG('photo-1563245372-f21724e3856d'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             2,
    preparationTimeMinutes: 15,
    allergens:              ['gluten'],
    tags:                   ['bestseller'],
    sortOrder:              8,
  },

  {
    _id:                    ID(9),
    cafeId:                 CAFE_ID,
    name:                   'Chicken Momo',
    description:            'Juicy steamed dumplings with minced chicken and herbs',
    price:                  180,
    portions: [
      { id: 'half', label: 'Half Plate', price: 180, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full Plate', price: 320, isDefault: false, sortOrder: 1 },
    ],
    category:               'snacks',
    emoji:                  '🥟',
    // Chicken dumplings / dim sum on plate
    image:                  IMG('photo-1625220194771-7ebdea0b70b9'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  false,
    spiceLevel:             2,
    preparationTimeMinutes: 15,
    allergens:              ['gluten'],
    tags:                   ['bestseller'],
    sortOrder:              9,
  },

  {
    _id:                    ID(10),
    cafeId:                 CAFE_ID,
    name:                   'Sel Roti',
    description:            'Traditional Nepali rice flour doughnuts, crispy outside and soft inside',
    price:                  120,
    portions: [
      { id: 'half', label: '3 Pieces', price: 120, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: '6 Pieces', price: 200, isDefault: false, sortOrder: 1 },
    ],
    category:               'snacks',
    emoji:                  '🍩',
    // Ring-shaped fried donuts — visual match for sel roti shape
    image:                  IMG('photo-1551024601-bec78aea704b'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 12,
    allergens:              ['gluten'],
    tags:                   ['new'],
    sortOrder:              10,
  },

  {
    _id:                    ID(11),
    cafeId:                 CAFE_ID,
    name:                   'Crispy Chicken Chilli',
    description:            'Wok-tossed fried chicken with green chillies, capsicum and soy glaze',
    price:                  260,
    portions: [
      { id: 'half', label: 'Half Plate', price: 260, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full Plate', price: 450, isDefault: false, sortOrder: 1 },
    ],
    category:               'snacks',
    emoji:                  '🌶️',
    // Crispy fried chicken pieces with chilli sauce
    image:                  IMG('photo-1527477396000-e27163b481c2'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  false,
    spiceLevel:             3,
    preparationTimeMinutes: 18,
    allergens:              ['gluten', 'soy'],
    tags:                   ['new'],
    sortOrder:              11,
  },

  {
    _id:                    ID(12),
    cafeId:                 CAFE_ID,
    name:                   'Thukpa',
    description:            'Tibetan noodle soup with vegetables and warming spices',
    price:                  200,
    portions: [
      { id: 'half', label: 'Regular Bowl', price: 200, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Large Bowl',   price: 320, isDefault: false, sortOrder: 1 },
    ],
    category:               'comfort_food',
    emoji:                  '🍜',
    // Asian noodle soup in bowl with broth — exact match for thukpa
    image:                  IMG('photo-1569050467447-ce54b3bbc37d'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             2,
    preparationTimeMinutes: 20,
    allergens:              ['gluten'],
    tags:                   ['new'],
    sortOrder:              12,
  },

  {
    _id:                    ID(13),
    cafeId:                 CAFE_ID,
    name:                   'Dal Bhat',
    description:            'Traditional Nepali lentil soup with steamed rice, pickles and greens',
    price:                  220,
    portions: [
      { id: 'half', label: 'Half Plate', price: 220, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full Plate', price: 380, isDefault: false, sortOrder: 1 },
    ],
    category:               'comfort_food',
    emoji:                  '🍛',
    // Dal bhat thali — rice, lentil, sides on round plate
    image:                  IMG('photo-1585937421612-70a008356fbe'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             1,
    preparationTimeMinutes: 15,
    allergens:              [],
    tags:                   ['bestseller'],
    sortOrder:              13,
  },

  {
    _id:                    ID(14),
    cafeId:                 CAFE_ID,
    name:                   'Chicken Fried Rice',
    description:            'Wok-tossed rice with egg, chicken strips and spring onions',
    price:                  240,
    portions: [
      { id: 'half', label: 'Half Plate', price: 240, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full Plate', price: 400, isDefault: false, sortOrder: 1 },
    ],
    category:               'comfort_food',
    emoji:                  '🍚',
    // Wok fried rice with egg and spring onion
    image:                  IMG('photo-1603133872878-684f208fb84b'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  false,
    spiceLevel:             1,
    preparationTimeMinutes: 18,
    allergens:              ['gluten', 'eggs', 'soy'],
    tags:                   [],
    sortOrder:              14,
  },

  {
    _id:                    ID(15),
    cafeId:                 CAFE_ID,
    name:                   'Veg Chowmein',
    description:            'Stir-fried noodles with fresh vegetables in a light soy sauce',
    price:                  180,
    portions: [
      { id: 'half', label: 'Half Plate', price: 180, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full Plate', price: 300, isDefault: false, sortOrder: 1 },
    ],
    category:               'comfort_food',
    emoji:                  '🍝',
    // Stir-fried noodles with vegetables in wok / plate
    image:                  IMG('photo-1612929633738-8fe44f7ec841'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             1,
    preparationTimeMinutes: 15,
    allergens:              ['gluten', 'soy'],
    tags:                   [],
    sortOrder:              15,
  },

  {
    _id:                    ID(16),
    cafeId:                 CAFE_ID,
    name:                   'Tomato Soup',
    description:            'Creamy roasted tomato soup with a swirl of cream and croutons',
    price:                  150,
    portions: [
      { id: 'half', label: 'Small Cup',  price: 150, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Large Bowl', price: 240, isDefault: false, sortOrder: 1 },
    ],
    category:               'soups',
    emoji:                  '🍅',
    // Creamy tomato soup with cream swirl in white bowl
    image:                  IMG('photo-1547592166-23ac45744acd'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 10,
    allergens:              ['milk', 'gluten'],
    tags:                   [],
    sortOrder:              16,
  },

  {
    _id:                    ID(17),
    cafeId:                 CAFE_ID,
    name:                   'Chicken Noodle Soup',
    description:            'Hearty chicken broth with thin noodles, shredded chicken and herbs',
    price:                  200,
    portions: [
      { id: 'half', label: 'Small Cup',  price: 200, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Large Bowl', price: 320, isDefault: false, sortOrder: 1 },
    ],
    category:               'soups',
    emoji:                  '🍲',
    // Chicken noodle soup with broth and herbs in bowl
    image:                  IMG('photo-1548943487-a2e4e43b4853'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  false,
    spiceLevel:             1,
    preparationTimeMinutes: 12,
    allergens:              ['gluten'],
    tags:                   [],
    sortOrder:              17,
  },

  {
    _id:                    ID(18),
    cafeId:                 CAFE_ID,
    name:                   'Chocolate Brownie',
    description:            'Warm fudgy brownie with a scoop of vanilla ice cream',
    price:                  250,
    portions: [
      { id: 'half', label: '1 Piece',  price: 250, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: '2 Pieces', price: 440, isDefault: false, sortOrder: 1 },
    ],
    category:               'desserts',
    emoji:                  '🍫',
    // Fudgy chocolate brownie with ice cream scoop
    image:                  IMG('photo-1606313564200-e75d5e30476c'),
    isAvailable:            true,
    isFeatured:             true,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 8,
    allergens:              ['milk', 'gluten', 'eggs'],
    tags:                   ['new'],
    sortOrder:              18,
  },

  {
    _id:                    ID(19),
    cafeId:                 CAFE_ID,
    name:                   'Cheese Garlic Bread',
    description:            'Toasted baguette with garlic butter and melted mozzarella',
    price:                  180,
    portions: [
      { id: 'half', label: '4 Slices', price: 180, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: '8 Slices', price: 300, isDefault: false, sortOrder: 1 },
    ],
    category:               'light_food',
    emoji:                  '🧄',
    // Toasted garlic bread with melted cheese on top
    image:                  IMG('photo-1573140247632-f8fd74997d5c'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             0,
    preparationTimeMinutes: 10,
    allergens:              ['milk', 'gluten'],
    tags:                   [],
    sortOrder:              19,
  },

  {
    _id:                    ID(20),
    cafeId:                 CAFE_ID,
    name:                   'Veg Sandwich',
    description:            'Toasted sandwich with cucumber, tomato, cheese and green chutney',
    price:                  160,
    portions: [
      { id: 'half', label: 'Half', price: 160, isDefault: true,  sortOrder: 0 },
      { id: 'full', label: 'Full', price: 260, isDefault: false, sortOrder: 1 },
    ],
    category:               'light_food',
    emoji:                  '🥪',
    // Toasted club sandwich with veggies, cut diagonal
    image:                  IMG('photo-1528735602780-2552fd46c7af'),
    isAvailable:            true,
    isFeatured:             false,
    isVeg:                  true,
    spiceLevel:             1,
    preparationTimeMinutes: 10,
    allergens:              ['gluten', 'milk'],
    tags:                   [],
    sortOrder:              20,
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB:', MONGODB_URI)

    if (process.argv.includes('--clear')) {
      const deleted = await MenuItem.deleteMany({ cafeId: CAFE_ID })
      console.log(`🗑  Cleared ${deleted.deletedCount} existing menu items`)
    }

    let inserted = 0
    let skipped  = 0

    for (const item of menuItems) {
      const result = await MenuItem.updateOne(
        { _id: item._id },
        { $setOnInsert: item },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted++
      else skipped++
    }

    console.log(`\n🌱 Seed complete!`)
    console.log(`   ✅ Inserted : ${inserted}`)
    console.log(`   ⏭  Skipped  : ${skipped} (already exist)`)
    console.log(`   📦 Total    : ${menuItems.length} items\n`)

    const categories = {}
    menuItems.forEach(i => { categories[i.category] = (categories[i.category] || 0) + 1 })
    console.log('📊 By category:')
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(22)} ${count} item${count > 1 ? 's' : ''}`)
    })

    const withPortions = menuItems.filter(i => i.portions.length > 0).length
    console.log(`\n🍽  With portions : ${withPortions}`)
    console.log(`🥤  Single price  : ${menuItems.length - withPortions}\n`)

  } catch (err) {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected')
  }
}

seed()