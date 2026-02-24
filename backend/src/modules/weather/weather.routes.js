// src/modules/weather/weather.routes.js
import { Router }            from 'express'
import { getCurrentWeather } from './weather.controller.js'

const router = Router()

// GET /api/weather/current?lat=27.68&lng=85.34
router.get('/current', getCurrentWeather)

export default router