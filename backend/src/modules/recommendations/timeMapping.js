// src/modules/recommendations/timeMapping.js

/**
 * Returns a time-of-day boost for given hour (0-23)
 */
export const getTimeBoost = (hour) => {
  if (hour >= 6 && hour < 10) {
    return { period: 'morning',   categories: ['tea', 'coffee', 'breakfast', 'hot_drinks'], bonus: 20 }
  }
  if (hour >= 10 && hour < 12) {
    return { period: 'mid-morning', categories: ['snacks', 'light_food', 'juice'], bonus: 12 }
  }
  if (hour >= 12 && hour < 15) {
    return { period: 'lunch',     categories: ['meals', 'soups', 'cold_drinks', 'fresh_juice'], bonus: 18 }
  }
  if (hour >= 15 && hour < 18) {
    return { period: 'afternoon', categories: ['tea', 'coffee', 'snacks', 'dessert'], bonus: 15 }
  }
  if (hour >= 18 && hour < 21) {
    return { period: 'evening',   categories: ['snacks', 'fast_food', 'cold_drinks', 'smoothies'], bonus: 15 }
  }
  if (hour >= 21 && hour < 24) {
    return { period: 'night',     categories: ['hot_drinks', 'dessert', 'comfort_food'], bonus: 12 }
  }
  // Late night / early morning (0-6)
  return { period: 'late_night', categories: ['coffee', 'snacks'], bonus: 8 }
}