import React from 'react'
import ReactDOM from 'react-dom/client'
import ImageMailMerge from './ImageMailMerge'
import Header from './header'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <Header />
      <ImageMailMerge />
    </div>
  </React.StrictMode>,
) 