// src/modules/table/detection/detectionMachine.js
import { createMachine, assign } from 'xstate'

export const detectionMachine = createMachine({
  id: 'tableDetection',
  initial: 'idle',
  context: {
    coords:          null,
    confidenceScore: 0,
    table:           null,
    sessionId:       null,
    error:           null,
    method:          null,   // 'gps' | 'qr' | 'manual'
  },
  states: {
    idle: {
      on: { START: 'requestingGPS' },
    },
    requestingGPS: {
      on: {
        GPS_GRANTED:  { target: 'collectingReadings', actions: 'storeCoords' },
        GPS_DENIED:   'showingQR',
        GPS_TIMEOUT:  'showingQR',
      },
    },
    collectingReadings: {
      on: {
        GPS_LOW_CONFIDENCE: 'showingQR',
        GPS_HIGH_CONFIDENCE: {
          target: 'creatingSession',
          actions: [
            assign({ method: () => 'gps' }),
            'storeCoords',
          ],
        },
      },
    },
    showingQR: {
      on: {
        QR_SCANNED:   { target: 'creatingSession', actions: assign({ method: () => 'qr' }) },
        MANUAL_ENTRY: { target: 'creatingSession', actions: assign({ method: () => 'manual' }) },
      },
    },
    creatingSession: {
      on: {
        SESSION_CREATED: { target: 'done',  actions: 'storeSession' },
        SESSION_ERROR:   { target: 'error', actions: 'storeError'   },
      },
    },
    done:  { type: 'final' },
    error: {
      on: { RETRY: 'idle' },
    },
  },
}, {
  actions: {
    storeCoords:  assign({ coords:    (_, e) => e.coords ?? null }),
    storeSession: assign({ table: (_, e) => e.table, sessionId: (_, e) => e.sessionId }),
    storeError:   assign({ error:     (_, e) => e.error }),
  },
})