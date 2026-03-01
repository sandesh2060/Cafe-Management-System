// src/modules/table/detection/detectionMachine.js
import { createMachine, assign } from 'xstate'

export const detectionMachine = createMachine({
  id:      'tableDetection',
  initial: 'idle',
  context: {
    coords:          null,
    confidenceScore: 0,      // Fix #3: now actually populated via storeCoords
    table:           null,
    sessionId:       null,
    error:           null,
    method:          null,
  },
  states: {
    idle: {
      on: { START: 'requestingGPS' },
    },

    requestingGPS: {
      on: {
        GPS_GRANTED:         { target: 'collectingReadings', actions: 'storeCoords' },
        GPS_DENIED:          'showingQR',
        GPS_TIMEOUT:         'showingQR',
        GPS_HIGH_CONFIDENCE: {
          target:  'creatingSession',
          actions: [ assign({ method: () => 'gps' }), 'storeCoords' ],
        },
        GPS_LOW_CONFIDENCE:  'showingQR',
      },
    },

    collectingReadings: {
      on: {
        GPS_LOW_CONFIDENCE:  'showingQR',
        GPS_HIGH_CONFIDENCE: {
          target:  'creatingSession',
          actions: [ assign({ method: () => 'gps' }), 'storeCoords' ],
        },
        GPS_DENIED:  'showingQR',
        GPS_TIMEOUT: 'showingQR',
      },
    },

    showingQR: {
      on: {
        QR_SCANNED:   { target: 'creatingSession', actions: assign({ method: () => 'qr'     }) },
        MANUAL_ENTRY: { target: 'creatingSession', actions: assign({ method: () => 'manual' }) },
        RETRY:        'idle',
      },
    },

    creatingSession: {
      on: {
        SESSION_CREATED: { target: 'done',  actions: 'storeSession' },
        // Fix #1: SESSION_ERROR always handled — machine can never be stuck here
        SESSION_ERROR:   { target: 'error', actions: 'storeError'   },
      },
    },

    // Fix #4: removed `type: 'final'` so RETRY works if navigation fails
    done: {
      on: { RETRY: 'idle' },
    },

    error: {
      on: { RETRY: 'idle' },
    },
  },
}, {
  actions: {
    // Fix #3: storeCoords now captures confidenceScore from the event
    storeCoords: assign({
      coords:          ({ event }) => event.coords          ?? null,
      confidenceScore: ({ event }) => event.confidenceScore ?? 0,
    }),
    storeSession: assign({
      table:     ({ event }) => event.table,
      sessionId: ({ event }) => event.sessionId,
    }),
    storeError: assign({
      error: ({ event }) => event.error,
    }),
  },
})