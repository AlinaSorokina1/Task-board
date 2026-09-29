import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'
import App from './App.tsx'
import { store } from './app/store'
import { captureFrontendException, initObservability, logFrontendEvent } from './observability/telemetry'

// Инициализируем Sentry/Faro при старте приложения.
initObservability()

// Фиксируем факт открытия страницы как стартовое событие с route.
void logFrontendEvent('page_opened', 'info', { route: window.location.pathname })

// Глобальный перехват необработанных runtime-ошибок из window.
window.addEventListener('error', (event) => {
  void captureFrontendException(event.error ?? new Error(event.message), 'window_error')
})

// Глобальный перехват необработанных Promise-ошибок.
window.addEventListener('unhandledrejection', (event) => {
  void captureFrontendException(event.reason, 'unhandled_rejection')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <MantineProvider
        defaultColorScheme="light"
        theme={{
          primaryColor: 'pink',
        }}
      >
        <ModalsProvider>
          <Notifications position="top-right" />
          <App />
        </ModalsProvider>
      </MantineProvider>
    </Provider>
  </StrictMode>,
)
