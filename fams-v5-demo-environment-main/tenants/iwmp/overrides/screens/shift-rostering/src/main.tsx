import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster, TooltipProvider } from '@fams/ui-kit'
import App from './App'
import { applyEmbedTheme, readEmbedParams } from './lib/embed'
import { RosterStoreProvider } from './state/store'
import './styles.css'

const params = readEmbedParams()
applyEmbedTheme(params)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={200}>
      <RosterStoreProvider actor={params.actor}>
        <App params={params} />
      </RosterStoreProvider>
    </TooltipProvider>
    <Toaster position="bottom-right" />
  </StrictMode>,
)
