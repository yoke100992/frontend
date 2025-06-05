// Final DashboardSellout.jsx with month/year filter (styled like name filter) and labeled responsive charts
import React, { useContext, useEffect, useState } from "react";

import * as XLSX from "xlsx";
import Select from "react-select";
import { motion } from "framer-motion";
import CountUp from "react-countup";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, ComposedChart
} from "recharts";

const SummaryCard = ({ label, value }) => {
  const cleanValue = parseFloat(
    typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value || 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6 text-center"
    >
      <div className="text-gray-500 text-sm mb-1">{label}</div>
      <div className="text-3xl font-semibold text-gray-900 dark:text-white">
        <CountUp end={cleanValue} duration={1.5} separator="," />
      </div>
    </motion.div>
  );
};
const SHEET_ID = "1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA";
const RANGE = "Sellout!A1:J";
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#22d3ee"];
const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];
const YEARS = [2022, 2023, 2024, 2025].map(y => ({ value: y.toString(), label: y.toString() }));

export default function DashboardSellout() {
  const { accessToken, login } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ region: "", group: "", store: "", name: "", month: "", year: "" });
  const [stats, setStats] = useState({});
  const [options, setOptions] = useState({ region: [], group: [], store: [], name: [] });

  useEffect(() => {
    if (!accessToken) return;
    fetchData();
  }, [accessToken]);

  const fetchData = async () => {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?majorDimension=ROWS`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const json = await res.json();
    if (!json.values) return;

    const [headers, ...rows] = json.values;
    const parsed = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || "");
      if (obj.Date) {
        const [day, month, year] = obj.Date.split('/');
        obj.dateObj = new Date(`${year}-${month}-${day}`);
      }
      return obj;
    });

    setData(parsed);
    setFiltered(parsed);
    setOptions({
      region: [...new Set(parsed.map(r => r.Region))],
      group: [...new Set(parsed.map(r => r.Group))],
      store: [...new Set(parsed.map(r => r.Store))],
      name: [...new Set(parsed.map(r => r.Name))]
    });
    computeStats(parsed);
  };

  const computeStats = (rows) => {
    const totalTarget = rows.reduce((sum, r) => sum + parseFloat(r.Target || 0), 0);
    const totalActual = rows.reduce((sum, r) => sum + parseFloat(r.Actual || 0), 0);
    const avgAch = rows.reduce((sum, r) => sum + parseFloat(r.ach?.replace("%", "").replace(",", ".") || 0), 0) / rows.length;
    const mitra = new Set(rows.map(r => r.Name)).size;
    const store = new Set(rows.map(r => r.Store)).size;

    const perRegion = {}, trend = {}, groupDist = {}, perMonth = {}, perQuarter = {}, productivityMap = {};

    rows.forEach(r => {
      const actual = parseFloat(r.Actual || 0);
      const target = parseFloat(r.Target || 0);
      const month = r.dateObj?.toLocaleString('default', { month: 'short' });
      const quarter = r.Quarterly;
      const name = r.Name;

      perRegion[r.Region] = (perRegion[r.Region] || 0) + actual;
      groupDist[r.Group] = (groupDist[r.Group] || 0) + actual;
      trend[month] = (trend[month] || 0) + actual;
      if (month) {
        if (!perMonth[month]) perMonth[month] = { actual: 0, target: 0 };
        perMonth[month].actual += actual;
        perMonth[month].target += target;
      }
      if (quarter) perQuarter[quarter] = (perQuarter[quarter] || 0) + actual;
      if (name) {
        if (!productivityMap[name]) productivityMap[name] = { actual: 0, count: 0 };
        productivityMap[name].actual += actual;
        productivityMap[name].count++;
      }
    });

    const productivity = Object.entries(productivityMap).map(([k, v]) => ({ name: k, value: v.actual / v.count }));

    setStats({
      totalTarget,
      totalActual,
      avgAch,
      mitra,
      store,
      perRegion: Object.entries(perRegion).map(([k, v]) => ({ name: k, value: v })),
      trend: Object.entries(trend).map(([k, v]) => ({ name: k, value: v })),
      groupDist: Object.entries(groupDist).map(([k, v]) => ({ name: k, value: v })),
      perMonth: Object.entries(perMonth).map(([k, v]) => ({ name: k, actual: v.actual, target: v.target })),
      perQuarter: Object.entries(perQuarter).map(([k, v]) => ({ name: k, value: v })),
      productivity
    });
  };

  const applyFilter = () => {
    const filtered = data.filter(row => {
      const matchRegion = filters.region ? row.Region === filters.region : true;
      const matchGroup = filters.group ? row.Group === filters.group : true;
      const matchStore = filters.store ? row.Store === filters.store : true;
      const matchName = filters.name ? row.Name === filters.name : true;
      const matchMonthYear = filters.month && filters.year
        ? row.dateObj?.getMonth() + 1 === parseInt(filters.month) && row.dateObj?.getFullYear() === parseInt(filters.year)
        : true;
      return matchRegion && matchGroup && matchStore && matchName && matchMonthYear;
    });
    setFiltered(filtered);
    computeStats(filtered);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sellout");
    XLSX.writeFile(wb, "Sellout_Export.xlsx");
  };

  if (!accessToken) return <div className="p-10 text-center"><button onClick={login} className="px-6 py-3 bg-blue-600 text-white rounded">Login dengan Google</button></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 Dashboard Sellout</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Select options={options.region.map(r => ({ value: r, label: r }))} onChange={v => setFilters(f => ({ ...f, region: v?.value || "" }))} placeholder="Region" />
        <Select options={options.group.map(r => ({ value: r, label: r }))} onChange={v => setFilters(f => ({ ...f, group: v?.value || "" }))} placeholder="Group" />
        <Select options={options.store.map(r => ({ value: r, label: r }))} onChange={v => setFilters(f => ({ ...f, store: v?.value || "" }))} placeholder="Store" />
        <Select options={options.name.map(r => ({ value: r, label: r }))} onChange={v => setFilters(f => ({ ...f, name: v?.value || "" }))} placeholder="Name" />
        <Select options={MONTHS} onChange={v => setFilters(f => ({ ...f, month: v?.value || "" }))} placeholder="Bulan" />
        <Select options={YEARS} onChange={v => setFilters(f => ({ ...f, year: v?.value || "" }))} placeholder="Tahun" />
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={applyFilter} className="px-4 py-2 bg-blue-600 text-white rounded">Terapkan Filter</button>
        <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded">Export Excel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard label="🎯 Total Target" value={stats.totalTarget?.toLocaleString()} />
        <SummaryCard label="✅ Total Actual" value={stats.totalActual?.toLocaleString()} />
        <SummaryCard label="📊 Rata-rata Ach" value={stats.avgAch?.toFixed(2) + "%"} />
        <SummaryCard label="👤 Mitra Unik" value={stats.mitra} />
        <SummaryCard label="🏬 Store Unik" value={stats.store} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  	<GraphCard title="Distribusi Group">
          <PieChart><Pie data={stats.groupDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{stats.groupDist?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
        </GraphCard>      

	  <GraphCard title="Actual per Region">
          <BarChart data={stats.perRegion}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#6366f1" label={{ position: "top" }} /></BarChart>
        </GraphCard>
        <GraphCard title="Tren Bulanan (Actual)">
          <LineChart data={stats.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="value" stroke="#3b82f6" label /></LineChart>
        </GraphCard>
      
        <GraphCard title="Agregasi Bulanan">
          <ComposedChart data={stats.perMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="actual" fill="#10b981" name="Actual" label={{ position: "top" }} /><Line type="monotone" dataKey="target" stroke="#f97316" name="Target" strokeWidth={2} label /></ComposedChart>
        </GraphCard>
        <GraphCard title="Tren per Quartal">
          <BarChart data={stats.perQuarter}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#f59e0b" label={{ position: "top" }} /></BarChart>
        </GraphCard>
        <GraphCard title="Produktivitas per Mitra">
          <BarChart data={stats.productivity}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#ef4444" label={{ position: "top" }} /></BarChart>
        </GraphCard>
      </div>
    </div>
  );
}


const GraphCard = ({ title, children }) => (
  <div className="bg-white border rounded shadow p-4 h-[300px] overflow-x-auto">
    <h3 className="text-sm font-semibold mb-2">{title}</h3>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
);
