import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

// Initialize spark shim (global spark.kv, spark.user, spark.llm)
import './lib/spark-shim'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
