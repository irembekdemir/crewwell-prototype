import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import WellnessPlanner from './WellnessPlanner'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <>
      <App />
      <WellnessPlanner />
    </>
  </React.StrictMode>,
)
