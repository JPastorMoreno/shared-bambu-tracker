import { NavLink } from 'react-router-dom'
import { WhoAmISelector } from './WhoAmISelector'

const ENLACES = [
  { to: '/', label: 'Panel', end: true },
  { to: '/compras', label: 'Compras' },
  { to: '/impresiones', label: 'Impresiones' },
  { to: '/stock', label: 'Stock' },
  { to: '/deseados', label: 'Deseados' },
  { to: '/ajustes', label: 'Ajustes' },
]

export function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">🎋 Bambu Tracker</span>
        <nav className="navbar-links">
          {ENLACES.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.end}
              className={({ isActive }) => `navbar-link${isActive ? ' navbar-link-active' : ''}`}
            >
              {enlace.label}
            </NavLink>
          ))}
        </nav>
        <WhoAmISelector />
      </div>
    </header>
  )
}
