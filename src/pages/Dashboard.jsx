// DashboardEnhanced.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../GoogleAuthProvider";
import Select from "react-select";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f0e", "#ff6384", "#36a2eb", "#4bc0c0"];

export default function DashboardEnhanced() {
  const { accessToken, login } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({ nama: [], area: [], bulan: "", startDate: '', endDate: '' });
  const [options, setOptions] = useState({ namaList: [], areaList: [] });
  const [stats, setStats] = useState({
    totalQty: 0, totalValue: 0, totalNamaUnik: 0,
    perDate: [], perBulan: [], perArea: [], perSKU: [], pelangganBaru: [], pelangganGrowth: []
  });
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    fetchData();
  }, [accessToken]);

  const getMonthNumber = (bulan) => {
    const map = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', Jun: '06',
      Jul: '07', Agt: '08', Sep: '09', Okt: '10', Nov: '11', Des: '12'
    };
    return map[bulan] || '01';
  };

  const fetchData = async () => {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA/values/DATA2?majorDimension=ROWS`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!json.values) return;
    const [headers, ...rows] = json.values;
    const parsed = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i] || ""));
      if (obj["Tanggal"]) {
        const parts = obj["Tanggal"].split(" ");
        if (parts.length === 2) {
          const day = parts[0].padStart(2, '0');
          const month = getMonthNumber(parts[1]);
          obj["tanggalISO"] = `2025-${month}-${day}`;
        }
      }
      return obj;
    });
    setData(parsed);
    setOptions({
      namaList: [...new Set(parsed.map(d => d.Nama))],
      areaList: [...new Set(parsed.map(d => d.Area))],
    });
    setFilteredData(parsed);
    updateStats(parsed);
  };

  useEffect(() => {
    if (data.length > 0) {
      const filtered = data.filter(row => {
        const isoDate = row["tanggalISO"];
        const namaMatch = filters.nama.length === 0 || filters.nama.includes(row.Nama);
        const areaMatch = filters.area.length === 0 || filters.area.includes(row.Area);
        const startMatch = filters.startDate ? isoDate >= filters.startDate : true;
        const endMatch = filters.endDate ? isoDate <= filters.endDate : true;
        const bulanMatch = filters.bulan ? isoDate.slice(5, 7) === filters.bulan : true;
        return namaMatch && areaMatch && bulanMatch && startMatch && endMatch;
      });
      setFilteredData(filtered);
      updateStats(filtered);
    }
  }, [filters, data]);

  const updateStats = (filtered) => {
    const totalQty = filtered.reduce((sum, r) => sum + Number(r.Penjualan || 0), 0);
    const totalValue = filtered.reduce((sum, r) => sum + Number(r.Value || 0), 0);
    const totalNamaUnik = new Set(filtered.map((r) => r.Nama)).size;

    const groupBy = (keyFn, valueFn) => {
      const map = new Map();
      filtered.forEach((r) => {
        const key = keyFn(r);
        const val = valueFn(r);
        map.set(key, (map.get(key) || 0) + val);
      });
      return [...map.entries()].map(([k, v]) => ({ name: k, value: v }));
    };

    let perDateRaw = groupBy(r => r["Tanggal"], r => Number(r.Penjualan || 0));
const perDate = perDateRaw
  .map(d => {
    const parts = d.name.split(" ");
    if (parts.length === 2) {
      const day = parts[0].padStart(2, '0');
      const month = getMonthNumber(parts[1]);
      const iso = `2025-${month}-${day}`;
      return { ...d, iso };
    }
    return { ...d, iso: d.name };
  })
  .sort((a, b) => a.iso.localeCompare(b.iso));
    let perBulanRaw = groupBy(r => r["Tanggal"].slice(3), r => Number(r.Penjualan || 0));

const bulanMap = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', Jun: '06',
  Jul: '07', Agt: '08', Sep: '09', Okt: '10', Nov: '11', Des: '12'
};

const perBulan = perBulanRaw
  .map(d => {
    const bulan = d.name.trim();
    const kode = bulanMap[bulan] || '00';
    return { ...d, kode };
  })
  .sort((a, b) => a.kode.localeCompare(b.kode));

    const perArea = groupBy(r => r.Area, r => Number(r.Value || 0));
    const perSKU = groupBy(r => r.SKU, r => Number(r.Penjualan || 0));
    const pelangganBaru = groupBy(r => r["Tanggal"].slice(3), r => 1);
    const pelangganGrowth = groupBy(r => r["Tanggal"].slice(3), r => 1);

    setStats({ totalQty, totalValue, totalNamaUnik, perDate, perBulan, perArea, perSKU, pelangganBaru, pelangganGrowth });
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, `dashboard_rekap_${Date.now()}.xlsx`);
  };

  const resetFilter = () => {
    setFilters({ nama: [], area: [], bulan: "", startDate: '', endDate: '' });
  };

  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';

  if (!accessToken) return (
    <div className="p-10 text-center">
      <button onClick={login} className="px-6 py-3 bg-blue-600 text-white rounded">Login dengan Google</button>
    
      <div className="overflow-y-auto border rounded mt-6 max-h-[400px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-200 sticky top-0">
            <tr>
              <th className="px-2 py-1">Nama</th>
              <th className="px-2 py-1">Area</th>
              <th className="px-2 py-1">Tanggal</th>
              <th className="px-2 py-1">SKU</th>
              <th className="px-2 py-1">Penjualan</th>
              <th className="px-2 py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="border px-2 py-1">{row.Nama}</td>
                <td className="border px-2 py-1">{row.Area}</td>
                <td className="border px-2 py-1">{row.Tanggal}</td>
                <td className="border px-2 py-1">{row.SKU}</td>
                <td className="border px-2 py-1 text-right">{row.Penjualan}</td>
                <td className="border px-2 py-1 text-right">{row.Value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );

  return (
    <div className={`p-6 min-h-screen ${bg}`}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded">Export Excel</button>
          <button onClick={resetFilter} className="px-4 py-2 bg-gray-400 text-white rounded">Reset</button>
          <button onClick={() => setDarkMode(!darkMode)} className="px-4 py-2 bg-black text-white rounded">{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Select isMulti options={options.namaList.map(n => ({ value: n, label: n }))} value={filters.nama.map(n => ({ value: n, label: n }))} onChange={val => setFilters({ ...filters, nama: val.map(v => v.value) })} placeholder="Nama" />
        <Select isMulti options={options.areaList.map(a => ({ value: a, label: a }))} value={filters.area.map(a => ({ value: a, label: a }))} onChange={val => setFilters({ ...filters, area: val.map(v => v.value) })} placeholder="Area" />
        <select className="p-2 border rounded" value={filters.bulan} onChange={e => setFilters({ ...filters, bulan: e.target.value })}>
          <option value="">Bulan</option>
          <option value="01">Januari</option>
          <option value="02">Februari</option>
          <option value="03">Maret</option>
          <option value="04">April</option>
          <option value="05">Mei</option>
          <option value="06">Juni</option>
          <option value="07">Juli</option>
          <option value="08">Agustus</option>
          <option value="09">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>
        <input type="date" className="p-2 border rounded" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
        <input type="date" className="p-2 border rounded" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <SummaryCard label="Total Penjualan" value={stats.totalQty.toLocaleString()} color="text-blue-600" />
        <SummaryCard label="Total Value" value={`Rp ${stats.totalValue.toLocaleString()}`} color="text-green-600" />
        <SummaryCard label="Pelanggan Unik" value={stats.totalNamaUnik.toLocaleString()} color="text-purple-600" />
      </div>

      
...

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GraphCard title="📅 Penjualan Harian">
          <BarChart data={stats.perDate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#3b82f6" /></BarChart>
        </GraphCard>
        <GraphCard title="📈 Tren Bulanan">
          <LineChart data={stats.perBulan}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="value" stroke="#6366f1" /></LineChart>
        </GraphCard>
        <GraphCard title="🌍 Distribusi Area">
          <PieChart><Pie data={stats.perArea} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{stats.perArea.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /></PieChart>
        </GraphCard>
        <GraphCard title="📦 Penjualan per SKU">
          <BarChart data={stats.perSKU}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#f59e0b" /></BarChart>
        </GraphCard>
        <GraphCard title="🆕 Pelanggan Baru">
          <BarChart data={stats.pelangganBaru}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#ec4899" /></BarChart>
        </GraphCard>
        <GraphCard title="📈 Pertumbuhan Pelanggan">
          <LineChart data={stats.pelangganGrowth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#f97316" /></LineChart>
        </GraphCard>
      </div>
    
      <div className="overflow-auto border rounded mt-6 max-h-[400px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-200 sticky top-0">
            <tr>
              <th className="px-2 py-1">Nama</th>
              <th className="px-2 py-1">Area</th>
              <th className="px-2 py-1">Tanggal</th>
              <th className="px-2 py-1">SKU</th>
              <th className="px-2 py-1">Penjualan</th>
              <th className="px-2 py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="border px-2 py-1">{row.Nama}</td>
                <td className="border px-2 py-1">{row.Area}</td>
                <td className="border px-2 py-1">{row.Tanggal}</td>
                <td className="border px-2 py-1">{row.SKU}</td>
                <td className="border px-2 py-1 text-right">{row.Penjualan}</td>
                <td className="border px-2 py-1 text-right">{row.Value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const SummaryCard = ({ label, value, color }) => (
  <div className="bg-white rounded-xl border shadow p-4 text-center">
    <div className="text-sm text-gray-500">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
  </div>
);

const GraphCard = ({ title, children }) => (
  <div className="bg-white p-4 rounded-xl shadow border h-[300px]">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
);
