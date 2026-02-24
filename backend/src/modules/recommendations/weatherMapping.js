// src/modules/recommendations/weatherMapping.js

export const WEATHER_MENU_MAP = {
  rainy: {
    boost:  ['hot_drinks', 'soups', 'snacks', 'comfort_food'],
    reduce: ['cold_drinks', 'ice_cream'],
    tag:    '☔ Perfect for rainy weather',
    score:  30,
  },
  hot: {
    boost:  ['cold_drinks', 'ice_cream', 'fresh_juice', 'light_food'],
    reduce: ['hot_drinks', 'soups'],
    tag:    '☀️ Cool you down',
    score:  30,
  },
  cold: {
    boost:  ['hot_drinks', 'soups', 'comfort_food', 'snacks'],
    reduce: ['cold_drinks', 'salads'],
    tag:    '❄️ Warm you up',
    score:  25,
  },
  sunny: {
    boost:  ['fresh_juice', 'light_snacks', 'smoothies'],
    reduce: ['heavy_food'],
    tag:    '🌤️ Fresh picks',
    score:  20,
  },
  windy: {
    boost:  ['hot_drinks', 'snacks', 'wraps'],
    reduce: [],
    tag:    '💨 Cozy choices',
    score:  15,
  },
  cloudy: {
    boost:  ['tea', 'coffee', 'snacks'],
    reduce: [],
    tag:    '☁️ Cloudy day picks',
    score:  10,
  },
}

// Map OpenWeatherMap conditions to our weather keys
export const mapOwmCondition = (owmMain, temp) => {
  const main = owmMain?.toLowerCase() || ''
  if (main.includes('rain') || main.includes('drizzle') || main.includes('thunder')) return 'rainy'
  if (main.includes('snow')) return 'cold'
  if (temp > 30) return 'hot'
  if (temp < 10) return 'cold'
  if (main.includes('cloud')) return 'cloudy'
  if (main.includes('wind')) return 'windy'
  return 'sunny'
}