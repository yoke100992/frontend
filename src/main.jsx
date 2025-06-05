// main.jsx FINAL tanpa login Google
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Table,
  MessageCircle,
  LogOut,
  Menu,
  X
} from "lucide-react";

import DashboardSellout from "./pages/DashboardSellout";
import SelloutTable from "./pages/SelloutTable";
import Data2Table from "./pages/Data2Table";
import FancyTable from "./pages/FancyTable";
import LoginPage from "./pages/LoginPage";
import CatatanKeuangan from "./pages/CatatanKeuangan";

import "./index.css";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100 text-gray-900">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              />
              <motion.div
                key="sidebar"
                ref={sidebarRef}
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-blue-900/90 to-indigo-800/90 backdrop-blur-md text-white shadow-2xl rounded-tr-3xl rounded-br-3xl"
              >
                <Sidebar setSidebarOpen={setSidebarOpen} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <MainContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>
    </BrowserRouter>
  );
};

const Sidebar = ({ setSidebarOpen }) => {
  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex justify-end mb-4">
        <button onClick={() => setSidebarOpen(false)} className="text-white text-2xl hover:text-gray-300 transition">
          <X />
        </button>
      </div>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-blue-400 shadow-lg mb-2 bg-white" />
        <p className="text-sm font-semibold">User</p>
        <p className="text-xs text-blue-200">Tanpa Login</p>
      </div>
      <nav className="w-full space-y-2 text-sm">
        
        <Link to="/sellout2" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-800">
          <Table className="w-5 h-5" />
          <span>Sell Out Table</span>
        </Link>
        <Link to="/inbox" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-800">
          <MessageCircle className="w-5 h-5" />
          <span>Pesan WhatsApp</span>
        </Link>
        <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-800">
          <Table className="w-5 h-5" />
          <span>Catatan Keuangan</span>
        </Link>
      </nav>
    </div>
  );
};

const MainContent = ({ sidebarOpen, setSidebarOpen }) => (
  <main className="flex-1 overflow-y-auto bg-white relative">
    <div className="flex items-center justify-start p-4">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-3 bg-white text-blue-700 rounded-full shadow-xl border border-blue-300 hover:scale-105 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Routes>
        
        <Route path="/sellout2" element={<SelloutTable />} />
        <Route path="/data2" element={<Data2Table />} />
        <Route path="/inbox" element={<FancyTable />} />
        <Route path="/" element={<CatatanKeuangan />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </motion.div>
  </main>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
