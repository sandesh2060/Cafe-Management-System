// src/modules/table/detection/detectionMachine.js
import { createMachine, assign } from 'xstate'

export const detectionMachine = createMachine({
  id:      'tableDetection',
  initial: 'idle',
  context: {
    coords:          null,
    confidenceScore: 0,
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
        QR_SCANNED:   { target: 'creatingSession', actions: assign({ method: () => 'qr' }) },
        MANUAL_ENTRY: { target: 'creatingSession', actions: assign({ method: () => 'manual' }) },
        RETRY:        'idle',
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
    // FIX: XState v5 assign syntax — ({ event }) not (_, e)
    storeCoords:  assign({ coords:    ({ event }) => event.coords ?? null }),
    storeSession: assign({
      table:     ({ event }) => event.table,
      sessionId: ({ event }) => event.sessionId,
    }),
    storeError:   assign({ error: ({ event }) => event.error }),
  },
})