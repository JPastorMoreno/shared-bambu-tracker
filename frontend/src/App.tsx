import { Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { Dashboard } from './pages/Dashboard'
import { Purchases } from './pages/Purchases'
import { PrintJobs } from './pages/PrintJobs'
import { Stock } from './pages/Stock'
import { Wishlist } from './pages/Wishlist'
import { Settings } from './pages/Settings'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/impresiones" element={<PrintJobs />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/deseados" element={<Wishlist />} />
          <Route path="/ajustes" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
