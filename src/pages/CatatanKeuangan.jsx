import React, { useEffect, useState, useRef } from "react";
import { db, ref, get, set, remove, onValue } from "../firebase-catatankeuangan";
import { FaTrash, FaEdit, FaPlus } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Chart from "chart.js/auto";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";



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
  const totalSaldo = totalPemasukan - totalPengeluaran;

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
  const sheet = workbook.addWorksheet("Catatan");

  // Header dan kolom
  sheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "Jenis", key: "jenis", width: 15 },
    { header: "Keterangan", key: "keterangan", width: 25 },
    { header: "Nominal", key: "nominal", width: 15 },
    { header: "Dok 1", key: "dok1", width: 15 },
    { header: "Dok 2", key: "dok2", width: 15 },
    { header: "Dok 3", key: "dok3", width: 15 },
  ];

  // Gaya header biru bold
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E90FF" }, // DodgerBlue
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

    // Tambah baris data biasa
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

  // Generate nama file berdasarkan tanggal + jam
  const now = new Date();
  const filename = `CatatanKeuangan-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};

  const handleDelete = async (item) => {
    try {
      await remove(ref(db, `catatan_keuangan/${item.id}`));
      setDeleteItem(null);
    } catch (err) {
      alert("❌ Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="p-4 text-sm">
      <h2 className="text-xl font-bold text-center mb-4">Catatan Keuangan</h2>
      <canvas ref={chartRef} style={{ display: 'none' }} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 border border-green-400 p-4 rounded shadow">
          <p className="text-gray-600">Total Pemasukan</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalPemasukan)}</p>
        </div>
        <div className="bg-red-100 border border-red-400 p-4 rounded shadow">
          <p className="text-gray-600">Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totalPengeluaran)}</p>
        </div>
        <div className="bg-blue-100 border border-blue-400 p-4 rounded shadow">
          <p className="text-gray-600">Saldo</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalSaldo)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input type="text" placeholder="Cari keterangan..." className="border p-2 rounded" value={search} onChange={e => setSearch(e.target.value)} />
        <input type="date" className="border p-2 rounded" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <select className="border p-2 rounded" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">Semua Bulan</option>
          {[...Array(12)].map((_, i) => (
            <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
          ))}
        </select>
        <select className="border p-2 rounded" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Semua Tahun</option>
          {[...new Set(data.map(d => d.tanggal?.slice(0,4)))].map((year, i) => (
            <option key={i} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setNewItem({})} className="bg-blue-600 text-white px-4 py-2 rounded"><FaPlus className="inline" /> Tambah</button>
        <button onClick={exportWithImages} className="bg-green-700 text-white px-4 py-2 rounded">
  Export Excel (Gambar)
</button>
        <button onClick={exportToPDFWithImages} className="bg-red-600 text-white px-4 py-2 rounded">Export PDF</button>
      </div>

      <div className="overflow-x-auto border rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-800 text-white">
            <tr>
              <th className="p-2">Tanggal</th>
              <th>Jenis</th>
              <th>Keterangan</th>
              <th>Nominal</th>
              <th>Dok 1</th>
              <th>Dok 2</th>
              <th>Dok 3</th>
              <th>Aksi</th>
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
        {[
          { key: "tanggal", label: "Tanggal", type: "date" },
          { key: "jenis", label: "Jenis", type: "dropdown" },
          { key: "keterangan", label: "Keterangan", type: "text" },
          { key: "nominal", label: "Nominal", type: "number" },
        ].map(({ key, label, type }) => (
          <div key={key} className="col-span-2">
            <label className="block text-sm font-medium mb-1">{label}</label>
            {type === "dropdown" ? (
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
              </select>
            ) : (
              <input
                type={type}
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

        {[1, 2, 3].map((num) => {
          const key = `dokumentasi${num}`;
          return (
            <div key={key} className="col-span-2">
              <label className="block text-sm font-medium mb-1">Dokumentasi {num}</label>
              <input
                type="file"
                accept="image/*"
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
        <button onClick={() => { setEditItem(null); setNewItem(null); }} className="bg-gray-300 px-4 py-2 rounded">Batal</button>
        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded">
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
