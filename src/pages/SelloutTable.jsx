import React, { useState, useEffect, useContext } from "react";
import Select from "react-select";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { AuthContext } from "../GoogleAuthProvider";
import {
  FaFilter, FaFileExcel, FaTrash, FaEdit, FaPrint,
  FaSearch, FaArrowLeft, FaArrowRight
} from "react-icons/fa";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const SHEET_ID = "1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA";
const RANGE = "Sellout!A1:J";
const SHEET_GID = 1432054009;


export default function SelloutTable() {
  const { accessToken, login } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ name: "", region: "", year: "", month: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const Modal = styled.div`
  animation: ${fadeIn} 0.3s ease-out;
`;


  useEffect(() => {
    if (!accessToken) return;
    fetchData();
  }, [accessToken]);

  useEffect(() => {
    if (alertMessage) {
      const timeout = setTimeout(() => setAlertMessage(""), 3000);
      return () => clearTimeout(timeout);
    }
  }, [alertMessage]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?majorDimension=ROWS`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await res.json();
      if (!json.values) return;

      const [headers, ...rows] = json.values;
      const parsed = rows.map((row, i) => {
        const obj = { _index: i + 2 };
        headers.forEach((h, j) => {
          obj[h.toLowerCase()] = row[j] || "";
        });
        const [day, month, year] = obj.date.split('/');
        obj.dateObj = new Date(`${year}-${month}-${day}`);
        return obj;
      });
      setData(parsed);
      setFiltered(parsed);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
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
  };

  const resetFilter = () => {
    setFilters({ name: "", region: "", year: "", month: "" });
    setFiltered(data);
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
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const range = `Sellout!A${editItem._index}:J${editItem._index}`;
      const values = [[
        editItem.date, editItem.quarterly, editItem.region, editItem.name,
        editItem.city, editItem.group, editItem.store, editItem.target,
        editItem.actual, editItem.ach
      ]];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ range, majorDimension: "ROWS", values }),
        }
      );

      setEditItem(null);
      setAlertMessage("✅ Data berhasil disimpan.");
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const deleteRequest = {
        requests: [
          {
            deleteRange: {
              range: {
                sheetId: SHEET_GID,
                startRowIndex: deleteItem._index - 1,
                endRowIndex: deleteItem._index,
              },
              shiftDimension: "ROWS",
            },
          },
        ],
      };

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteRequest),
      });

      setFiltered(filtered.filter(d => d._index !== deleteItem._index));
      setData(data.filter(d => d._index !== deleteItem._index));
      setDeleteItem(null);
      setAlertMessage("✅ Data berhasil dihapus.");
    } catch (err) {
      alert("Gagal menghapus data.");
    }
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
  const chartActual = {
    labels: filtered.map((d) => d.name),
    datasets: [
      {
        label: "Actual",
        data: filtered.map((d) => parseFloat(d.actual || 0)),
        backgroundColor: "#3B82F6"
      }
    ]
  };

  const chartTargetVsActual = {
    labels: filtered.map((d) => d.name),
    datasets: [
      {
        label: "Target",
        data: filtered.map((d) => parseFloat(d.target || 0)),
        backgroundColor: "#10B981"
      },
      {
        label: "Actual",
        data: filtered.map((d) => parseFloat(d.actual || 0)),
        backgroundColor: "#3B82F6"
      }
    ]
  };

  const chartRegion = {
    labels: regions,
    datasets: [
      {
        label: "Total Actual",
        data: regions.map(region =>
          filtered
            .filter(d => d.region === region)
            .reduce((sum, d) => sum + parseFloat(d.actual || 0), 0)
        ),
        backgroundColor: "#F59E0B"
      }
    ]
  };

  const chartPieActualByRegion = {
    labels: regions,
    datasets: [
      {
        label: "Actual",
        data: regions.map(region =>
          filtered
            .filter(d => d.region === region)
            .reduce((sum, d) => sum + parseFloat(d.actual || 0), 0)
        ),
        backgroundColor: [
          "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6",
          "#EC4899", "#8B5CF6", "#14B8A6", "#F472B6", "#F87171"
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 10 },
          padding: 8
        }
      },
      title: {
        display: true,
        text: 'Distribusi Actual per Region',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        },
        align: 'center'
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 0
      }
    }
  };

  if (!accessToken) {
    return (
      <div className="p-6 text-center text-sm">

{loading && (
  <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/50">
    <div className="flex flex-col items-center space-y-4 animate-fadeIn">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-800 font-medium">Memuat data...</p>
    </div>
  </div>
)}

        <button onClick={login} className="bg-blue-600 text-white px-6 py-3 rounded text-sm">
          Login dengan Google
        </button>
      </div>
    );
  }

  
  return (
    <div className="p-4 text-sm">

      {/* ALERT */}
      {alertMessage && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-4 py-2 rounded shadow z-50 animate-fadeIn">
          {alertMessage}
        </div>
      )}

      {/* Filter */}
      <div className="sticky top-0 z-20 bg-gray-100 p-4 rounded shadow-md transition-all duration-300 ease-in-out">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <Select options={names.map(n => ({ value: n, label: n }))} placeholder="Nama"
            onChange={v => setFilters(f => ({ ...f, name: v?.value || "" }))} isClearable className="w-40" />
          <Select options={regions.map(r => ({ value: r, label: r }))} placeholder="Region"
            onChange={v => setFilters(f => ({ ...f, region: v?.value || "" }))} isClearable className="w-40" />
          <Select options={years.map(y => ({ value: y, label: y }))} placeholder="Tahun"
            onChange={v => setFilters(f => ({ ...f, year: v?.value || "" }))} isClearable className="w-32" />
          <Select options={months} placeholder="Bulan"
            onChange={v => setFilters(f => ({ ...f, month: v?.value || "" }))} isClearable className="w-40" />
          <button onClick={applyFilter} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
            <FaFilter /> Terapkan
          </button>
          <button onClick={resetFilter} className="bg-gray-400 text-white px-4 py-2 rounded">Reset</button>
        </div>
        <div className="flex gap-2 mb-2">
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari..." className="border p-2 rounded w-full max-w-xs" />
          <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
            <FaFileExcel /> Excel
          </button>
          <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2">
            <FaPrint /> PDF
          </button>
        </div>
      </div>

      

      {/* Table Scrollable */}
      <div className="max-h-[500px] overflow-y-auto border rounded shadow">
        <table className="min-w-full table-auto text-sm">
          <thead className="sticky top-0 bg-blue-800 text-white z-10">
            <tr>
              <th className="p-2">Date</th><th>Quarterly</th><th>Region</th><th>Name</th><th>City</th>
              <th>Group</th><th>Store</th><th>Target</th><th>Actual</th><th>Ach</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {searchedData.map((row, i) => (
              <tr key={i} className="text-center border-t">
                <td className="p-2">{row.date}</td><td>{row.quarterly}</td><td>{row.region}</td><td>{row.name}</td>
                <td>{row.city}</td><td>{row.group}</td><td>{row.store}</td><td>{row.target}</td>
                <td>{row.actual}</td><td>{row.ach}</td>
                <td className="flex gap-1 justify-center">
                  <button onClick={() => setEditItem(row)} className="bg-yellow-400 text-black px-2 py-1 rounded text-xs"><FaEdit /></button>
                  <button onClick={() => setDeleteItem(row)} className="bg-red-600 text-white px-2 py-1 rounded text-xs"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Edit */}
      {editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">Edit Data</h2>
            < div className="grid grid-cols-2 gap-4">
              {["date", "name", "region", "store", "city", "target", "actual", "group", "ach"].map(key => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1 capitalize">{key}</label>
                  <input
                    className="w-full border px-3 py-2 rounded"
                    value={editItem[key] || ""}
                    onChange={e => setEditItem(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditItem(null)} className="bg-gray-300 px-4 py-2 rounded">Batal</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded">
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <Modal className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-4">Konfirmasi Hapus</h3>
            <p className="text-sm mb-4">
              Yakin ingin menghapus data <strong>{deleteItem.name}</strong> dari <strong>{deleteItem.region}</strong> toko <strong>{deleteItem.store}</strong>?<br />
              Tanggal: <strong>{deleteItem.date}</strong>, Actual: <strong>{deleteItem.actual}</strong>
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setDeleteItem(null)} className="px-4 py-2 bg-gray-300 rounded">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">Hapus</button>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
