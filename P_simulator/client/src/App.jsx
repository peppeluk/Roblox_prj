import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import LiquiditaPage from "./pages/LiquiditaPage";
import TariffaPage from "./pages/TariffaPage";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">P Simulator</p>
            <p className="text-sm text-slate-600">Gestione tariffa e liquidita</p>
          </div>
          <nav className="flex items-center gap-2 rounded-xl bg-slate-200 p-1">
            <NavItem to="/tariffa">Tariffa</NavItem>
            <NavItem to="/liquidita">Liquidita</NavItem>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        <Routes>
          <Route path="/" element={<Navigate to="/tariffa" replace />} />
          <Route path="/liquidita" element={<LiquiditaPage />} />
          <Route path="/tariffa" element={<TariffaPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
