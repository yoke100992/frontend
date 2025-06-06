import React, { useEffect, useState, useRef } from "react";
import { db, ref, get, set, remove, onValue } from "../firebase-catatankeuangan";
import { FaTrash, FaEdit, FaPlus, FaArrowUp, FaArrowDown, FaWallet } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Chart from "chart.js/auto";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

export default function CatatanKeuangan() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));

  const [newItem, setNewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const chartRef = useRef();

  useEffect(() => {
    const unsub = onValue(ref(db, "catatan_keuangan"), (snapshot) => {
      const val = snapshot.val();
      const rows = val ? Object.values(val) : [];
      setData(rows);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let filtered = [...data];
    if (search) filtered = filtered.filter((d) => d.keterangan?.toLowerCase().includes(search.toLowerCase()));
    if (filterDate) filtered = filtered.filter((d) => d.tanggal === filterDate);
    if (filterMonth) filtered = filtered.filter((d) => d.tanggal?.slice(5, 7) === filterMonth);
    if (filterYear) filtered = filtered.filter((d) => d.tanggal?.slice(0, 4) === filterYear);
    setFilteredData(filtered);
  }, [data, search, filterDate, filterMonth, filterYear]);

  const totalPemasukan = data.reduce((sum, d) => sum + (d.jenis === "Pemasukan" ? parseFloat(d.nominal) : 0), 0);
  const totalPengeluaran = data.reduce((sum, d) => sum + (d.jenis === "Pengeluaran" ? parseFloat(d.nominal) : 0), 0);
  const totalBayarPinjaman = data.reduce((sum, d) => sum + (d.jenis === "Bayar Pinjaman" ? parseFloat(d.nominal) : 0), 0);
  const totalSaldo = totalPemasukan - totalPengeluaran - totalBayarPinjaman;
  const totalPinjaman = data.reduce((sum, d) => sum + (d.jenis === "Pinjaman" ? parseFloat(d.nominal) : 0), 0);
  const totalSisaPinjaman = totalPinjaman - totalBayarPinjaman;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const pemasukanHariIni = data.reduce((sum, d) => sum + (d.jenis === "Pemasukan" && d.tanggal === today ? parseFloat(d.nominal) : 0), 0);
  const pemasukanKemarin = data.reduce((sum, d) => sum + (d.jenis === "Pemasukan" && d.tanggal === yesterday ? parseFloat(d.nominal) : 0), 0);
  const pengeluaranHariIni = data.reduce((sum, d) => sum + (d.jenis === "Pengeluaran" && d.tanggal === today ? parseFloat(d.nominal) : 0), 0);
  const pengeluaranKemarin = data.reduce((sum, d) => sum + (d.jenis === "Pengeluaran" && d.tanggal === yesterday ? parseFloat(d.nominal) : 0), 0);

  const formatCurrency = (num) =>
    Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(row => ({
      Tanggal: row.tanggal,
      Jenis: row.jenis,
      Keterangan: row.keterangan,
      Nominal: row.nominal,
      Dokumentasi1: row.dokumentasi1 || "",
      Dokumentasi2: row.dokumentasi2 || "",
      Dokumentasi3: row.dokumentasi3 || "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catatan");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "CatatanKeuangan.xlsx");
  };

  const exportToPDFWithImages = () => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text("Catatan Keuangan", pageWidth / 2, 15, { align: "center" });

  // Buat tabel utama
  autoTable(doc, {
    startY: 25,
    head: [["Tanggal", "Jenis", "Keterangan", "Nominal"]],
    body: filteredData.map((row) => [
      row.tanggal,
      row.jenis,
      row.keterangan,
      `Rp ${Number(row.nominal || 0).toLocaleString("id-ID")}`,
    ]),
    styles: {
      fillColor: [30, 144, 255], // Dodger Blue
      textColor: 255,
      halign: "center",
    },
    headStyles: { fillColor: [30, 144, 255] },
    bodyStyles: { halign: "left", valign: "middle" },
    theme: "grid",
  });

  // Tambah gambar per baris
  let yPos = doc.lastAutoTable.finalY + 5;
  const maxWidth = 50;
  const maxHeight = 30;

  filteredData.forEach((row, i) => {
    const docs = [row.dokumentasi1, row.dokumentasi2, row.dokumentasi3];
    const images = docs.filter(Boolean);

    if (images.length > 0) {
      doc.setFontSize(10);
      doc.text(`Dokumentasi untuk: ${row.keterangan}`, 10, yPos);

      let x = 10;
      yPos += 2;

      images.forEach((img) => {
        try {
          doc.addImage(img, "JPEG", x, yPos + 3, maxWidth, maxHeight);
          x += maxWidth + 5;
        } catch (err) {
          console.warn("Gagal menambahkan gambar", err);
        }
      });

      yPos += maxHeight + 10;
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    }
  });

  const now = new Date();
  const filename = `CatatanKeuangan-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.pdf`;

  doc.save(filename);
};

 

const exportWithImages = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Catatan Keuangan");

  if (activeTab === 'detail') {
    // Header dan kolom untuk detail
    sheet.columns = [
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Jenis", key: "jenis", width: 15 },
      { header: "Keterangan", key: "keterangan", width: 25 },
      { header: "Nominal", key: "nominal", width: 15 },
      { header: "Dok 1", key: "dok1", width: 15 },
      { header: "Dok 2", key: "dok2", width: 15 },
      { header: "Dok 3", key: "dok3", width: 15 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E90FF" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    for (let i = 0; i < filteredData.length; i++) {
      const row = filteredData[i];
      const rowIndex = i + 2;

      sheet.addRow({
        tanggal: row.tanggal,
        jenis: row.jenis,
        keterangan: row.keterangan,
        nominal: row.nominal,
      });

      const docs = [row.dokumentasi1, row.dokumentasi2, row.dokumentasi3];
      let hasImage = false;

      docs.forEach((img, idx) => {
        if (img) {
          hasImage = true;
          const imageId = workbook.addImage({
            base64: img,
            extension: "jpeg",
          });

          sheet.addImage(imageId, {
            tl: { col: 4 + idx, row: rowIndex - 1 },
            ext: { width: 60, height: 60 },
          });
        }
      });

      if (hasImage) {
        sheet.getRow(rowIndex).height = 45;
      }
    }
  }

  if (activeTab === 'rekap') {
    // Header untuk rekap
    sheet.columns = [
      { header: "Bulan", key: "bulan", width: 20 },
      { header: "Jenis", key: "jenis", width: 15 },
      { header: "Nominal", key: "nominal", width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E90FF" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const rekapMap = data.reduce((acc, item) => {
      const month = new Date(item.tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const key = `${month}-${item.jenis}`;
      if (!acc[key]) acc[key] = { bulan: month, jenis: item.jenis, nominal: 0 };
      acc[key].nominal += parseFloat(item.nominal);
      return acc;
    }, {});

    Object.values(rekapMap).forEach((row) => {
      sheet.addRow(row);
    });
  }

  const now = new Date();
const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

const filename = `CatatanKeuangan-${activeTab}-${timestamp}.xlsx`;

const buffer = await workbook.xlsx.writeBuffer();
saveAs(new Blob([buffer]), filename);
};


const handleSave = async () => {
  setIsSaving(true);
  const isEdit = !!editItem;
  const item = isEdit ? editItem : newItem;

  try {
    const snapshot = await get(ref(db, "catatan_keuangan"));
    const allData = snapshot.val() || {};
    const nextId = isEdit ? item.id : Math.max(0, ...Object.keys(allData).map(Number)) + 1;

    const nominal = parseFloat(item.nominal || 0);

    const payload = {
      id: nextId,
      tanggal: item.tanggal,
      keterangan: item.keterangan,
      jenis: item.jenis,
      nominal,
      dokumentasi1: item.dokumentasi1 || "",
      dokumentasi2: item.dokumentasi2 || "",
      dokumentasi3: item.dokumentasi3 || "",
    };

    await set(ref(db, `catatan_keuangan/${nextId}`), payload);
    setNewItem(null);
    setEditItem(null);
  } catch (err) {
    alert("❌ Gagal menyimpan: " + err.message);
  }

  setIsSaving(false);
};

const handleDelete = async (item) => {
  try {
    await remove(ref(db, `catatan_keuangan/${item.id}`));
    setDeleteItem(null);
  } catch (err) {
    alert("❌ Gagal menghapus: " + err.message);
  }
};

  const scorecards = [
    {
      label: "Saldo",
      value: totalSaldo,
      icon: <FaWallet />, color: "from-blue-500 to-blue-700",
      tooltip: "Jumlah saldo saat ini",
      trend: [1000, 2000, 3000, totalSaldo]
    },
    {
      label: "Total Pinjaman",
      value: totalSisaPinjaman,
      icon: <FaArrowUp />, color: "from-purple-500 to-purple-700",
      tooltip: "Akumulasi semua pemasukan",
      trend: [1000, 2500, 4000, totalSisaPinjaman]
    },
    {
      label: "Total Pemasukan",
      value: totalPemasukan,
      icon: <FaArrowUp />, color: "from-green-500 to-green-700",
      tooltip: "Akumulasi semua pemasukan",
      trend: [1000, 2500, 4000, totalPemasukan]
    },
    {
      label: "Pemasukan Hari Ini",
      value: pemasukanHariIni,
      icon: <FaArrowUp />, color: "from-emerald-500 to-emerald-700",
      tooltip: "Pemasukan yang tercatat hari ini",
      trend: [0, pemasukanHariIni]
    },
    {
      label: "Pemasukan Kemarin",
      value: pemasukanKemarin,
      icon: <FaArrowUp />, color: "from-lime-400 to-lime-600",
      tooltip: "Pemasukan yang tercatat kemarin",
      trend: [0, pemasukanKemarin]
    },
    {
      label: "Pengeluaran Hari Ini",
      value: pengeluaranHariIni,
      icon: <FaArrowDown />, color: "from-red-400 to-red-600",
      tooltip: "Pengeluaran yang tercatat hari ini",
      trend: [0, pengeluaranHariIni]
    },
    {
      label: "Pengeluaran Kemarin",
      value: pengeluaranKemarin,
      icon: <FaArrowDown />, color: "from-orange-400 to-orange-600",
      tooltip: "Pengeluaran yang tercatat kemarin",
      trend: [0, pengeluaranKemarin]
    },
    {
      label: "Total Pengeluaran",
      value: totalPengeluaran,
      icon: <FaArrowDown />, color: "from-rose-500 to-rose-700",
      tooltip: "Akumulasi semua pengeluaran",
      trend: [1000, 1500, 2500, totalPengeluaran]
    }
  ];
const [activeTab, setActiveTab] = useState('detail');
  return (
    <div className="p-4 text-sm">
   <div className="mb-6 text-center">
  <div className="flex justify-center items-center gap-2 mb-0">
    <div className="text-green-500 text-3xl">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75zM2.25 9h19.5" />
</svg>
    </div>
    <h2 className="text-3xl font-extrabold text-green-500 drop-shadow-sm">
      Catatan Keuangan
    </h2>
  </div>
  <p className="text-gray-500 text-sm">Kelola pemasukan & pengeluaran dengan mudah dan rapi</p>
</div>

  

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
  {scorecards.map((item, idx) => (
    <div
      key={idx}
      className={`bg-gradient-to-r ${item.color} text-white px-3 py-2 rounded-lg shadow-md transition-all hover:scale-[1.02]`}
      data-tooltip-id="tooltip-global"
      data-tooltip-content={item.tooltip}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide mb-1">
        {item.icon}
        <span>{item.label}</span>
      </div>
      <p className="text-base font-semibold">{formatCurrency(item.value)}</p>
      <Sparklines data={item.trend} height={24} margin={4}>
        <SparklinesLine color="#ffffff80" style={{ strokeWidth: 2, fill: "none" }} />
      </Sparklines>
    </div>
  ))}
  <ReactTooltip id="tooltip-global" place="top" effect="solid" className="text-xs" />
</div>

   <div className="flex justify-center flex-wrap gap-1 mb-4 items-center">
        <input type="text" placeholder="Cari keterangan..." className="border p-1 rounded" value={search} onChange={e => setSearch(e.target.value)} />
        <input type="date" className="border p-1 rounded" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <select className="border p-1 rounded" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">Semua Bulan</option>
          {[...Array(12)].map((_, i) => (
            <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
          ))}
        </select>
        <select className="border py-1 rounded" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Semua Tahun</option>
          {[...new Set(data.map(d => d.tanggal?.slice(0,4)))].map((year, i) => (
            <option key={i} value={year}>{year}</option>
          ))}
        </select>
	 <button onClick={exportWithImages} className="bg-green-600 to text-white px-2 p-1 rounded">Export Excel</button>
        <button onClick={exportToPDFWithImages} className="bg-red-600 text-white px-2 p-1 rounded">Export PDF</button>
      </div>

      

<div className="mb-4 flex gap-2">
  <button
    onClick={() => setActiveTab('detail')}
    className={`px-4 py-2 rounded-md font-semibold border ${activeTab === 'detail' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
  >
    Data Harian
  </button>
  <button
    onClick={() => setActiveTab('rekap')}
    className={`px-4 py-2 rounded-md font-semibold border ${activeTab === 'rekap' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
  >
    Rekap Bulanan
  </button>
</div>

{activeTab === 'rekap' && (
  <div className="overflow-x-auto rounded-lg border">
    <table className="min-w-full text-sm text-left">
      <thead className="bg-blue-800 text-white">
        <tr>
          <th className="px-4 py-2">Bulan</th>
          <th className="px-4 py-2">Jenis</th>
          <th className="px-4 py-2">Nominal</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(
          data.reduce((acc, item) => {
            const month = new Date(item.tanggal).toLocaleDateString('id-ID', {
              month: 'long',
              year: 'numeric'
            });
            const key = `${month}-${item.jenis}`;
            if (!acc[key]) acc[key] = { month, jenis: item.jenis, nominal: 0 };
            acc[key].nominal += parseFloat(item.nominal);
            return acc;
          }, {})
        ).map((row, i) => (
          <tr key={i} className="border-b hover:bg-gray-100">
            <td className="px-4 py-2 whitespace-nowrap">{row.month}</td>
            <td className="px-4 py-2 whitespace-nowrap">{row.jenis}</td>
            <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(row.nominal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
{activeTab === 'detail' && (
 <>
    <button
      onClick={() => setNewItem({})}
      className="mb-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Tambah Data
    </button>
      <div className="overflow-x-auto border rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-800 text-white">
            <tr>
          <th className="px-2 py-1">Tanggal</th>
      	  <th className="px-2 py-1">Jenis</th>
          <th className="px-2 py-1 w-1/3 min-w-[120px]">Keterangan</th>
          <th className="px-2 py-1">Nominal</th>
          <th className="px-2 py-1">Dok 1</th>
          <th className="px-2 py-1">Dok 2</th>
          <th className="px-2 py-1">Dok 3</th>
          <th className="px-2 py-1">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id} className="text-center border-t">
                <td>{row.tanggal}</td>
                <td>{row.jenis}</td>
                <td>{row.keterangan}</td>
                <td>{formatCurrency(row.nominal)}</td>
                {[row.dokumentasi1, row.dokumentasi2, row.dokumentasi3].map((src, idx) => (
                  <td key={idx}>
                    {src && (
                      <img
                        src={src}
                        alt={`dok${idx + 1}`}
                        className="h-10 mx-auto rounded cursor-pointer hover:opacity-80"
                        onClick={() => setImagePreview(src)}
                      />
                    )}
                  </td>
                ))}
                <td className="flex gap-1 justify-center">
                  <button onClick={() => setEditItem(row)} className="bg-yellow-400 text-black px-2 py-1 rounded"><FaEdit /></button>
                  <button onClick={() => setDeleteItem(row)} className="bg-red-600 text-white px-2 py-1 rounded"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
</>
)}
      {/* Modal preview gambar */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={() => setImagePreview(null)}>
          <img src={imagePreview} className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow" alt="Preview" />
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-4">Konfirmasi Hapus</h3>
            <p className="mb-4">Yakin ingin menghapus <strong>{deleteItem.keterangan}</strong>?</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeleteItem(null)} className="bg-gray-300 px-4 py-2 rounded">Batal</button>
              <button onClick={() => handleDelete(deleteItem)} className="bg-red-600 text-white px-4 py-2 rounded">Hapus</button>
            </div>
          </div>
        </div>
      )}

     {(newItem || editItem) && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 overflow-y-auto">
    <div className="bg-white p-6 rounded shadow max-w-xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">{editItem ? "Edit Data" : "Tambah Data"}</h2>
      <div className="grid grid-cols-2 gap-4">
        {["tanggal", "jenis", "keterangan"].map((key) => (
          <div key={key} className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            {key === "jenis" ? (
              <select
                className="w-full border px-3 py-2 rounded"
                value={(editItem || newItem)[key] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  editItem
                    ? setEditItem({ ...editItem, [key]: val })
                    : setNewItem({ ...newItem, [key]: val });
                }}
              >
                <option value="">Pilih Jenis</option>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
		<option value="Pinjaman">Pinjaman</option>
		<option value="Bayar Pinjaman">Bayar Pinjaman</option>
              </select>
            ) : (
              <input
                type={key === "tanggal" ? "date" : "text"}
                className="w-full border px-3 py-2 rounded"
                value={(editItem || newItem)[key] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  editItem
                    ? setEditItem({ ...editItem, [key]: val })
                    : setNewItem({ ...newItem, [key]: val });
                }}
              />
            )}
          </div>
        ))}

        {/* Nominal dengan format Rp */}
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Nominal</label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            value={formatCurrency((editItem || newItem)?.nominal || 0)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "");
              const val = parseInt(raw || "0", 10);
              if (editItem) setEditItem({ ...editItem, nominal: val });
              else setNewItem({ ...newItem, nominal: val });
            }}
          />
        </div>

        {[1, 2, 3].map((num) => {
          const key = `dokumentasi${num}`;
          return (
            <div key={key} className="col-span-2">
              <label className="block text-sm font-medium mb-1">Dokumentasi {num}</label>
              <input
                type="file"
                accept="image/*"
		capture
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result;
                      const item = editItem || newItem;
                      const updated = { ...item, [key]: base64 };
                      editItem ? setEditItem(updated) : setNewItem(updated);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {(editItem || newItem)[key] && (
                <div className="relative mt-2 inline-block">
                  <img src={(editItem || newItem)[key]} className="h-20 rounded border" />
                  <button
                    onClick={() => {
                      const item = editItem || newItem;
                      const updated = { ...item, [key]: "" };
                      editItem ? setEditItem(updated) : setNewItem(updated);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                  >×</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end gap-2 sticky bottom-0 bg-white pt-4">
        <button
          onClick={() => {
            setEditItem(null);
            setNewItem(null);
          }}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
