import React, { useState, useContext } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import FancyTable from "./pages/FancyTable";
import Data2Table from "./pages/Data2Table";
import DashboardSellout from "./pages/DashboardSellout";
import SelloutTable from "./pages/SelloutTable";
import "./index.css";
import { GoogleAuthProvider, AuthContext } from "./GoogleAuthProvider";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <GoogleAuthProvider>
      <BrowserRouter>
        <div className="flex h-screen">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <MainContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>
      </BrowserRouter>
    </GoogleAuthProvider>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { accessToken, logout, user } = useContext(AuthContext);

  return (
    <aside
      className={`transition-all duration-300 bg-blue-800 text-white flex flex-col h-screen ${
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      }`}
    >
      {sidebarOpen && (
        <>
          <div className="p-4">
            <h1 className="text-xl font-bold mb-4">📊 Yoke Data Analyst</h1>
            <nav className="space-y-2">
              <Link to="/" className="block hover:bg-cyan-700 p-2 rounded">
                Dashboard/Statistik
              </Link>
              <Link to="/inbox" className="block hover:bg-cyan-700 p-2 rounded">
                Pesan WhatsApp
              </Link>
              <Link to="/data2" className="block hover:bg-cyan-700 p-2 rounded">
                Data Penjualan
              </Link>
              <Link to="/sellout" className="block hover:bg-cyan-700 p-2 rounded">
                Dashboard Sellout
              </Link>
              <Link to="/sellout2" className="block hover:bg-cyan-700 p-2 rounded">
                Sell Out Table
              </Link>
            </nav>

            {accessToken && user && (
              <div className="mt-6 pt-4 border-t border-blue-600 flex items-center gap-3">
                <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full" />
                <div className="text-sm">
                  <p className="font-semibold leading-tight">{user.name}</p>
                  <p className="text-xs text-gray-300 truncate">{user.email}</p>
                  <button
                    onClick={logout}
                    className="mt-2 text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

const MainContent = ({ sidebarOpen, setSidebarOpen }) => (
  <main className="flex-1 overflow-y-auto bg-gray-50 relative">
    {/* Tombol Toggle Sidebar */}
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className={`p-2 m-2 bg-white rounded shadow text-gray-800 fixed top-4 ${sidebarOpen ? 'left-60' : 'left-3'} z-50`}
    >
      ☰
    </button>

    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/inbox" element={<FancyTable />} />
      <Route path="/data2" element={<Data2Table />} />
      <Route path="/sellout" element={<DashboardSellout />} />
      <Route path="/sellout2" element={<SelloutTable />} />
    </Routes>
  </main>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
