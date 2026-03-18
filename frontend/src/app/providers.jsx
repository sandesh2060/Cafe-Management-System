// src/app/providers.jsx
//
// Single source of all top-level providers.
// Order:
//   Redux → BrowserRouter → DeviceTierProvider → ThemeProvider → Lenis
//
// DeviceTierProvider added so every component can call useDeviceTier().
// Detection runs once at app start — never again.

import { Provider }           from 'react-redux'
import { BrowserRouter }      from 'react-router-dom'
import { ReactLenis }         from 'lenis/react'
import { ThemeProvider }      from '@shared/context/ThemeContext'
import { DeviceTierProvider } from '@shared/context/DeviceTierContext'
import store                  from '@store'

const lenisOptions = {
  lerp:        0.1,
  smoothWheel: true,
  syncTouch:   false,
}

const Providers = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DeviceTierProvider>
        <ThemeProvider>
          <ReactLenis root options={lenisOptions}>
            {children}
          </ReactLenis>
        </ThemeProvider>
      </DeviceTierProvider>
    </BrowserRouter>
  </Provider>
)

export default Providers