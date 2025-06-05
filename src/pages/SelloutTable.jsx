import React, { useState, useEffect, useContext } from "react";
import Select from "react-select";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  FaFilter, FaFileExcel, FaTrash, FaEdit, FaPrint
} from "react-icons/fa";
import { db, ref, get, set, update, remove, onValue } from '../firebaseClient';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const SHEET_ID = "1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA";
const RANGE = "Sellout!A1:J";
const SHEET_GID = 1432054009;

export default function SelloutTable() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ name: "", region: "", year: "", month: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

useEffect(() => {
  if (!data || !data.length) {
    setFiltered([]);
    return;
  }

  const f = data.filter((d) => {
    const nameFilter = filters.name?.toLowerCase().trim();
    const regionFilter = filters.region?.toLowerCase().trim();
    const yearFilter = filters.year?.trim();
    const monthFilter = filters.month?.trim();

    const nameMatch = nameFilter ? d.name?.toLowerCase().includes(nameFilter) : true;
    const regionMatch = regionFilter ? d.region?.toLowerCase().includes(regionFilter) : true;
    const yearMatch = yearFilter ? d.dateObj?.getFullYear().toString() === yearFilter : true;
    const monthMatch = monthFilter ? (d.dateObj?.getMonth() + 1).toString().padStart(2, "0") === monthFilter : true;

    return nameMatch && regionMatch && yearMatch && monthMatch;
  });

  setFiltered(f);
  setPage(1);
}, [filters, data]);


useEffect(() => {
  const salesRef = ref(db, 'sales');
  const unsubscribe = onValue(salesRef, (snapshot) => {
    console.log('📡 Firebase updated...');
    fetchData();
  });

  return () => unsubscribe();
}, []);


 useEffect(() => {
  if (alertMessage) {
    const timeout = setTimeout(() => setAlertMessage(""), 3000);
    return () => clearTimeout(timeout);
  }
}, [alertMessage]);

const fetchData = async () => {
  console.log('🔥 Fetching from Firebase...');
  setLoading(true);

  const snapshot = await get(ref(db, 'sales'));
  const rawData = snapshot.val();

  if (!rawData) {
    setData([]);
    setFiltered([]);
    setLoading(false);
    return;
  }

  const rows = Object.values(rawData);

  const parsed = rows.map((row) => {
    const formatted = {};
    Object.keys(row).forEach(key => {
      formatted[key.toLowerCase()] = row[key];
    });

    let dateObj = null;
    if (formatted.date?.includes('/')) {
      const [d, m, y] = formatted.date.split('/');
      dateObj = new Date(`${y}-${m}-${d}`);
    } else {
      dateObj = new Date(formatted.date);
    }

    return { ...formatted, dateObj };
  });

  setData(parsed);
  setFiltered(parsed);
  setLoading(false);
};

const [newItem, setNewItem] = useState(null);
 
const handleSave = async () => {
  if (!editItem) return;
  setIsSaving(true);

  const updates = {
    id: editItem.id,
    date: formatToIso(editItem.date),
    quarterly: editItem.quarterly,
    region: editItem.region,
    name: editItem.name,
    city: editItem.city,
    group: editItem.group,
    store: editItem.store,
    target: parseFloat(editItem.target) || 0,
    actual: parseFloat(editItem.actual) || 0,
    ach: parseFloat(editItem.ach) || 0
  };

  try {
    await set(ref(db, `sales/${editItem.id}`), updates);
    setAlertMessage("✅ Data berhasil disimpan.");
    setEditItem(null);
    fetchData();
  } catch (err) {
    alert("❌ Gagal menyimpan data:\n" + err.message);
  }

  setIsSaving(false);
};

const handleDelete = async () => {
  if (!deleteItem) return;

  try {
    await remove(ref(db, `sales/${deleteItem.id}`));
    setDeleteItem(null);
    setAlertMessage("🗑️ Data berhasil dihapus.");
    fetchData();
  } catch (err) {
    alert("❌ Gagal menghapus data:\n" + err.message);
  }
};


// bantu fungsi konversi tanggal
const formatToIso = (input) => {
  if (!input.includes("/")) return input;
  const [d, m, y] = input.split("/");
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};


  const applyFilter = () => {
    const f = data.filter((d) => {
      const matchName = filters.name ? d.name === filters.name : true;
      const matchRegion = filters.region ? d.region === filters.region : true;
      const matchYear = filters.year ? d.dateObj.getFullYear().toString() === filters.year : true;
      const matchMonth = filters.month ? (d.dateObj.getMonth() + 1).toString().padStart(2, "0") === filters.month : true;
      return matchName && matchRegion && matchYear && matchMonth;
    });
    setFiltered(f);
    setPage(1);
  };

  const resetFilter = () => {
    setFilters({ name: "", region: "", year: "", month: "" });
    setFiltered(data);
    setPage(1);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sellout");
    XLSX.writeFile(wb, "Sellout_Export.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["Date", "Quarterly", "Region", "Name", "City", "Group", "Store", "Target", "Actual", "Ach"]],
      body: filtered.map(row => [
        row.date, row.quarterly, row.region, row.name, row.city, row.group,
        row.store, row.target, row.actual, row.ach
      ])
    });
    doc.save("Sellout_Export.pdf");
  };



 

  const names = [...new Set(data.map((d) => d.name))];
  const regions = [...new Set(data.map((d) => d.region))];
  const years = [...new Set(data.map((d) => new Date(d.dateObj).getFullYear().toString()))];
  const months = [...Array(12)].map((_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: new Date(0, i).toLocaleString('id-ID', { month: 'long' })
  }));

  const searchedData = filtered.filter(d =>
    Object.values(d).some(val => typeof val === "string" && val.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 text-sm">
      <h2 className="text-center text-xl font-bold mb-4">Dashboard Penjualan</h2>

      {alertMessage && (
  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4 text-center">
    {alertMessage}
  </div>
)}

      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <Select options={names.map(n => ({ value: n, label: n }))} placeholder="Nama"
          onChange={v => setFilters(f => ({ ...f, name: v?.value || "" }))} isClearable className="w-40" />
        <Select options={regions.map(r => ({ value: r, label: r }))} placeholder="Region"
          onChange={v => setFilters(f => ({ ...f, region: v?.value || "" }))} isClearable className="w-40" />
        <Select options={years.map(y => ({ value: y, label: y }))} placeholder="Tahun"
          onChange={v => setFilters(f => ({ ...f, year: v?.value || "" }))} isClearable className="w-32" />
        <Select options={months} placeholder="Bulan"
          onChange={v => setFilters(f => ({ ...f, month: v?.value || "" }))} isClearable className="w-40" />
        <button onClick={applyFilter} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <FaFilter /> Terapkan
        </button>
        <button onClick={resetFilter} className="bg-gray-400 text-white px-4 py-2 rounded">Reset</button>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari..." className="border p-2 rounded" />
        <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <FaFileExcel /> Excel
        </button>
        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <FaPrint /> PDF
        </button>
      </div>

      

      <div className="overflow-x-auto border rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-800 text-white">
            <tr>
              <th className="p-2">Date</th><th>Quarterly</th><th>Region</th><th>Name</th><th>City</th>
              <th>Group</th><th>Store</th><th>Target</th><th>Actual</th><th>Ach</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
  {data.length === 0 ? (
    <tr>
      <td colSpan="11" className="text-center py-4 text-gray-500">
        Tidak ada data tersedia.
      </td>
    </tr>
  ) : (
    searchedData.map((row, i) => (
      <tr key={i} className="text-center border-t">
        <td>{row.date}</td>
        <td>{row.quarterly}</td>
        <td>{row.region}</td>
        <td>{row.name}</td>
        <td>{row.city}</td>
        <td>{row.group}</td>
        <td>{row.store}</td>
        <td>
          {Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(row.target || 0)}
        </td>
        <td>
          {Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(row.actual || 0)}
        </td>
        <td>{(parseFloat(row.ach) || 0).toFixed(2)}%</td>
        <td className="flex gap-1 justify-center">
          <button
            onClick={() => setNewItem({})}
            className="bg-blue-500 text-white px-2 py-1 rounded"
          >
            +
          </button>
          <button
            onClick={() => setEditItem(row)}
            className="bg-yellow-400 px-2 py-1 text-xs rounded text-black"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => setDeleteItem(row)}
            className="bg-red-600 px-2 py-1 text-xs rounded text-white"
          >
            <FaTrash />
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>


        </table>


{editItem && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded shadow max-w-2xl w-full">
      <h2 className="text-lg font-bold mb-4">Edit Data</h2>
      <div className="grid grid-cols-2 gap-4">
        {["date", "quarterly", "region", "name", "city", "group", "store", "target", "actual", "ach"].map(key => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1 capitalize">{key}</label>
            {key === "ach" ? (
              <input
                type="text"
                className="w-full border px-3 py-2 rounded bg-gray-100"
                value={editItem.ach ? editItem.ach + "%" : ""}
                readOnly
              />
            ) : (
              <input
                type={key === "date" ? "date" : "text"}
                className="w-full border px-3 py-2 rounded"
                value={
                  ["target", "actual"].includes(key) && editItem[key]
                    ? parseFloat(editItem[key]).toLocaleString("id-ID")
                    : editItem[key] || ""
                }
                onChange={e => {
                  let inputValue = e.target.value;

                  setEditItem(prev => {
                    const updated = { ...prev };

                    if (key === "target" || key === "actual") {
                      const numeric = inputValue.replace(/[^\d]/g, "");
                      updated[key] = numeric ? parseFloat(numeric) : "";
                      const actual = key === "actual" ? parseFloat(numeric) : parseFloat(prev.actual) || 0;
                      const target = key === "target" ? parseFloat(numeric) : parseFloat(prev.target) || 0;
                      updated.ach = target !== 0 ? (actual / target * 100).toFixed(2) : "";
                    } else {
                      updated[key] = inputValue;
                    }

                    return updated;
                  });
                }}
                placeholder={["target", "actual"].includes(key) ? "Rp 0" : ""}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={() => setEditItem(null)} className="bg-gray-300 px-4 py-2 rounded">Batal</button>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={isSaving}
        >
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  </div>
)}




{newItem && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded shadow max-w-2xl w-full">
      <h2 className="text-lg font-bold mb-4">Tambah Data Baru</h2>
      <div className="grid grid-cols-2 gap-4">
        {["date", "quarterly", "region", "name", "city", "group", "store", "target", "actual", "ach"].map(key => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1 capitalize">{key}</label>
            {key === "ach" ? (
              <input
                type="text"
                className="w-full border px-3 py-2 rounded bg-gray-100"
                value={newItem.ach ? newItem.ach + "%" : ""}
                readOnly
              />
            ) : (
              <input
                type={key === "date" ? "date" : key === "target" || key === "actual" ? "text" : "text"}
                className="w-full border px-3 py-2 rounded"
                value={
                  ["target", "actual"].includes(key) && newItem[key]
                    ? parseFloat(newItem[key]).toLocaleString("id-ID")
                    : newItem[key] || ""
                }
                onChange={e => {
                  let inputValue = e.target.value;

                  setNewItem(prev => {
                    const updated = { ...prev };

                    if (key === "target" || key === "actual") {
                      const numeric = inputValue.replace(/[^\d]/g, "");
                      updated[key] = numeric ? parseFloat(numeric) : "";
                      const actual = key === "actual" ? parseFloat(numeric) : parseFloat(prev.actual) || 0;
                      const target = key === "target" ? parseFloat(numeric) : parseFloat(prev.target) || 0;
                      updated.ach = target !== 0 ? (actual / target * 100).toFixed(2) : "";
                    } else {
                      updated[key] = inputValue;
                    }

                    return updated;
                  });
                }}
                placeholder={["target", "actual"].includes(key) ? "Rp 0" : ""}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={() => setNewItem(null)} className="bg-gray-300 px-4 py-2 rounded">Batal</button>
        <button
          onClick={async () => {
            setIsSaving(true);
            try {
              const snapshot = await get(ref(db, 'sales'));
              const existing = snapshot.val() || {};
              const nextId = Math.max(...Object.keys(existing).map(Number)) + 1 || 1;

              const newData = {
                id: nextId,
                date: newItem.date || "",
                quarterly: newItem.quarterly || "",
                region: newItem.region || "",
                name: newItem.name || "",
                city: newItem.city || "",
                group: newItem.group || "",
                store: newItem.store || "",
                target: newItem.target === "" ? 0 : parseFloat(newItem.target),
                actual: newItem.actual === "" ? 0 : parseFloat(newItem.actual),
                ach: parseFloat(newItem.ach) || 0
              };

              await set(ref(db, `sales/${nextId}`), newData);
              setNewItem(null);
              setAlertMessage("✅ Data baru berhasil ditambahkan.");
              fetchData();
            } catch (err) {
              alert("❌ Gagal menambahkan data:\n" + err.message);
            }
            setIsSaving(false);
          }}
          disabled={isSaving}
          className={`px-4 py-2 rounded text-white ${isSaving ? "bg-blue-400" : "bg-blue-600"}`}
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  </div>
)}



{deleteItem && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
   <div className="bg-white w-[95%] max-w-xl sm:max-w-lg overflow-y-auto rounded-lg shadow-lg p-6">

      <h3 className="text-lg font-semibold mb-4">Konfirmasi Hapus</h3>
      <p className="text-sm mb-4">
        Yakin ingin menghapus data <strong>{deleteItem.name}</strong> dari <strong>{deleteItem.region}</strong> toko <strong>{deleteItem.store}</strong>?<br />
        Tanggal: <strong>{deleteItem.date}</strong>, Actual: <strong>{deleteItem.actual}</strong>
      </p>
      {isSaving ? (
        <div className="text-blue-600 text-sm">Menghapus data...</div>
      ) : (
        <div className="flex justify-center gap-4">
          <button onClick={() => setDeleteItem(null)} className="px-4 py-2 bg-gray-300 rounded">Batal</button>
          <button onClick={handleDelete} disabled={isSaving} className="px-4 py-2 bg-red-600 text-white rounded">
            Hapus
          </button>
        </div>
      )}
    </div>
  </div>
)}

      </div>
    </div>
  );
}
