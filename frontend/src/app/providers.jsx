// src/app/providers.jsx
//
// Top-level provider composition for the app.
// Wraps children with all context providers in the correct order:
//   Redux store → React Router → Theme → Lenis scroll
//
// App.jsx renders: <Providers><AppInner /></Providers>
// This keeps App.jsx clean and providers composable/testable.

import { Provider }       from 'react-redux'
import { BrowserRouter }  from 'react-router-dom'
import { ReactLenis }     from 'lenis/react'
import { ThemeProvider }  from '@shared/context/ThemeContext'
import store              from '@store'

const lenisOptions = {
  lerp:         0.1,
  smoothWheel:  true,
  syncTouch:    false,   // don't hijack native touch scroll on mobile
}

const Providers = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>
      <ThemeProvider>
        <ReactLenis root options={lenisOptions}>
          {children}
        </ReactLenis>
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
)

export default Providers