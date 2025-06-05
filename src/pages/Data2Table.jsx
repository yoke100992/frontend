// src/pages/Data2Table.jsx
import React, { useEffect, useState, useContext } from "react";
import { Dialog } from "@headlessui/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AuthContext } from "../GoogleAuthProvider";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SPREADSHEET_ID = "1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA";
const SHEET_NAME = "DATA2";
const SHEET_ID = 821092307; // Ganti sesuai gid sheet DATA2

export default function Data2Table() {
  const { accessToken, login } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [options, setOptions] = useState({ namaList: [], areaList: [] });
  const [filters, setFilters] = useState({ nama: null, area: null, startDate: null, endDate: null });

  useEffect(() => {
    if (!accessToken) return;
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?majorDimension=ROWS`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((json) => {
        const [headers, ...rows] = json.values;
        const parsed = rows.map((row, index) => {
          const rowData = {};
          headers.forEach((h, i) => (rowData[h] = row[i] || ""));
          rowData._row = index + 2;
          return rowData;
        });
        setData(parsed);
        const namaList = [...new Set(parsed.map((row) => row["Nama"]))];
        const areaList = [...new Set(parsed.map((row) => row["Area"]))];
        setOptions({ namaList, areaList });
      });
  }, [accessToken]);

  const columnLabels = {
    Waktu: "Waktu Input",
    Nama: "Nama Pelanggan",
    Area: "Area",
    SKU: "Kode SKU",
    "Nama SKU": "Nama Produk",
    Penjualan: "Qty",
    Value: "Total (Rp)",
    Image: "Link Gambar",
    Tanggal: "Tanggal",
    Jam: "Jam",
  };

  const openModal = (row, type) => {
    setSelectedRow(row);
    setFormData(row);
    setModalType(type);
    setSuccessMessage("");
    setLoading(false);
  };

  const closeModal = () => {
    setSelectedRow(null);
    setModalType("");
    setSuccessMessage("");
    setLoading(false);
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      const rowNum = selectedRow._row;
      const values = [[
        formData["No"], formData["Waktu"], formData["Nama"], formData["Area"], formData["SKU"],
        formData["Nama SKU"], formData["Penjualan"], formData["Value"], formData["Image"],
        formData["Tanggal"], formData["Jam"]
      ]];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${rowNum}:K${rowNum}?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      });
      setData((prev) => prev.map((row) => row["No"] === selectedRow["No"] ? formData : row));
      setSuccessMessage("✅ Data berhasil disimpan!");
      setTimeout(closeModal, 1200);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const rowNum = selectedRow._row;
      const deleteRowRequest = {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: SHEET_ID,
                dimension: "ROWS",
                startIndex: rowNum - 1,
                endIndex: rowNum,
              },
            },
          },
        ],
      };
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteRowRequest),
      });
      setData(data.filter((row) => row["No"] !== selectedRow["No"]));
      setSuccessMessage("🗑️ Baris berhasil dihapus!");
      setTimeout(closeModal, 1200);
    } catch (err) {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DATA2");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "data2_export.xlsx");
  };

  const filteredData = data.filter((row) => {
    const matchNama = filters.nama ? row["Nama"] === filters.nama : true;
    const matchArea = filters.area ? row["Area"] === filters.area : true;
    const rowDate = new Date(row["Tanggal"]);
    const matchStart = filters.startDate ? rowDate >= filters.startDate : true;
    const matchEnd = filters.endDate ? rowDate <= filters.endDate : true;
    return matchNama && matchArea && matchStart && matchEnd;
  });

  if (!accessToken) {
    return (
      <div className="p-10 text-center">
        <button
          onClick={login}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
        >
          🔐 Login dengan Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 text-center">DATA2 - Penjualan</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Select
          options={options.namaList.map((n) => ({ value: n, label: n }))}
          value={filters.nama ? { value: filters.nama, label: filters.nama } : null}
          onChange={(selected) => setFilters({ ...filters, nama: selected?.value || null })}
          placeholder="Pilih Nama"
          isClearable
        />
        <Select
          options={options.areaList.map((a) => ({ value: a, label: a }))}
          value={filters.area ? { value: filters.area, label: filters.area } : null}
          onChange={(selected) => setFilters({ ...filters, area: selected?.value || null })}
          placeholder="Pilih Area"
          isClearable
        />
        <DatePicker
          selected={filters.startDate}
          onChange={(date) => setFilters({ ...filters, startDate: date })}
          placeholderText="Tanggal Awal"
          className="border p-2 rounded w-full"
        />
        <DatePicker
          selected={filters.endDate}
          onChange={(date) => setFilters({ ...filters, endDate: date })}
          placeholderText="Tanggal Akhir"
          className="border p-2 rounded w-full"
        />
      </div>

      <div className="flex justify-end mb-4">
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          onClick={exportToExcel}
        >
          Export Excel
        </button>
      </div>

      <div className="overflow-auto max-h-[75vh] border rounded-lg shadow">
        <table className="w-full table-fixed border-separate border-spacing-y-2 text-sm">
          <thead className="sticky top-0 bg-blue-800 text-white">
            <tr>
              {["Waktu", "Nama", "Area", "SKU", "Nama SKU", "Penjualan", "Value", "Image", "Tanggal", "Jam", "Actions"].map((col) => (
                <th key={col} className="px-2 py-2 text-left">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row["No"]} className="bg-white hover:bg-blue-50">
                {["Waktu", "Nama", "Area", "SKU", "Nama SKU", "Penjualan", "Value", "Image", "Tanggal", "Jam"].map((key) => (
                  <td key={key} className="px-2 py-1 max-w-[150px] truncate" title={row[key]}>
                    {key === "Image" && row[key] ? (
                      <a href={row[key]} className="text-blue-600 underline" target="_blank" rel="noreferrer">Image</a>
                    ) : row[key] || "-"}
                  </td>
                ))}
                <td className="px-2 py-1">
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded mr-2" onClick={() => openModal(row, "edit")}>Edit</button>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => openModal(row, "delete")}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!modalType} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-xl space-y-4">
            <Dialog.Title className="text-lg font-bold">
              {modalType === "edit" ? "Edit Data Penjualan" : "Konfirmasi Hapus"}
            </Dialog.Title>
            {modalType === "edit" ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(formData).slice(2, 11).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1 font-semibold">{columnLabels[key] || key}</label>
                    <input
                      className="border rounded p-2"
                      value={value}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      placeholder={columnLabels[key] || key}
                      readOnly={key === "Jam"}
                    />
                  </div>
                ))}
                {loading && <div className="text-blue-600 col-span-2 animate-pulse">⏳ Menyimpan perubahan...</div>}
                {successMessage && <div className="text-green-600 col-span-2">{successMessage}</div>}
              </div>
            ) : (
              <>
                <p>Yakin ingin menghapus data <b>{selectedRow?.Nama}</b> tanggal: <b>{selectedRow?.Tanggal}</b>?</p>
                {loading && <div className="text-blue-600 animate-pulse">⏳ Menghapus...</div>}
                {successMessage && <div className="text-green-600">{successMessage}</div>}
              </>
            )}
            {!successMessage && (
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={closeModal}>Batal</button>
                <button className={`px-4 py-2 rounded text-white ${modalType === "edit" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`} onClick={modalType === "edit" ? handleEdit : handleDelete}>
                  {modalType === "edit" ? "Simpan" : "Hapus"}
                </button>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
