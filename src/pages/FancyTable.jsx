import React, { useEffect, useState, useContext } from "react";
import { Dialog } from "@headlessui/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AuthContext } from "../GoogleAuthProvider";

const SPREADSHEET_ID = "1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA";
const SHEET_ID = 833098087; // INBOX2 sheet ID
const SHEET_NAME = "INBOX2";

export default function FancyTable() {
  const { accessToken, login } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const json = await res.json();
    const [headers, ...rows] = json.values;
    const rowObjects = rows.map((row, i) => {
      const obj = Object.fromEntries(headers.map((h, j) => [h, row[j] || ""]));
      obj._row = i + 2;
      return obj;
    });
    setData(rowObjects);
  };

  useEffect(() => {
    if (accessToken) fetchData();
  }, [accessToken]);

  const handleEdit = (row) => {
    setSelectedRow(row);
    setFormData(row);
    setModalOpen(true);
    setSuccessMessage("");
  };

  const handleDelete = (row) => {
    setConfirmDeleteRow(row);
  };

  const confirmDelete = async () => {
    const row = confirmDeleteRow;
    setConfirmDeleteRow(null);
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: SHEET_ID,
                  dimension: "ROWS",
                  startIndex: row._row - 1,
                  endIndex: row._row,
                },
              },
            },
          ],
        }),
      }
    );
    fetchData();
  };

  const saveEdit = async () => {
    setLoading(true);
    const range = `${SHEET_NAME}!B${selectedRow._row}:F${selectedRow._row}`;
    const values = [[
      formData.Waktu || "",
      formData.Jenis || "",
      formData.Nomor || "",
      formData["Isi Pesan"] || "",
      formData.Url || "",
    ]];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ range, values }),
      }
    );
    setSuccessMessage("✅ Data berhasil disimpan!");
    setTimeout(() => {
      setModalOpen(false);
      setLoading(false);
      fetchData();
    }, 1000);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "INBOX2");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(fileData, "inbox_export.xlsx");
  };

  const filteredData = data.filter((row) =>
    Object.values(row).some(
      (val) => typeof val === "string" && val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      {!accessToken && (
        <div className="flex flex-col items-center">
          <button
            onClick={login}
            className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow"
          >
            🔐 Login dengan Google
          </button>
          <p className="text-gray-600">Silakan login untuk mengakses data.</p>
        </div>
      )}

      {accessToken && (
        <>
          <h2 className="text-xl font-bold mb-4 text-center">INBOX WHATSAPP</h2>

          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              placeholder="Cari isi pesan, nomor, jenis..."
              className="border rounded p-2 w-full max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="ml-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              onClick={exportToExcel}
            >
              Export Excel
            </button>
          </div>

          <div className="overflow-x-auto max-h-[75vh] border rounded-lg shadow">
            <table className="w-full table-fixed border-separate border-spacing-y-1 text-sm">
              <thead className="sticky top-0 bg-blue-800 text-white text-sm">
                <tr>
                  <th className="px-2 py-2 text-left w-[120px] ">Waktu</th>
                  <th className="px-2 py-2 text-left w-[120px]">Nomor</th>
                  <th className="px-2 py-2 text-left w-[50px]">Jenis</th>
                  <th className="px-2 py-2 text-left w-[250px]  ">Isi Pesan</th>
                  <th className="px-2 py-2 text-left w-[140px]">Gambar</th>
                  <th className="px-2 py-2 text-left w-[100px] ">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="bg-white hover:bg-cyan-50 transition">
                    <td className="px-2 py-2">{row.Waktu}</td>
                    <td className="px-2 py-2">{row.Nomor}</td>
                    <td className="px-2 py-2">{row.Jenis}</td>
                    <td className="px-2 py-2 " title={row["Isi Pesan"]}>{row["Isi Pesan"]}</td>
                    <td className="px-2 py-2 break-all">
                      {row.Url ? (
                        <a href={row.Url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{row.Url}</a>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center space-x-1">
                      <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs" onClick={() => handleEdit(row)}>Edit</button>
                      <button className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs" onClick={() => handleDelete(row)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <Dialog.Title className="text-lg font-bold">Edit Data</Dialog.Title>
            <div className="grid gap-3">
              {["Waktu", "Jenis", "Nomor", "Isi Pesan", "Url"].map((key) => (
                <input
                  key={key}
                  className="border rounded p-2"
                  value={formData[key] || ""}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={key}
                />
              ))}
              {loading && <div className="text-blue-600 animate-pulse">⏳ Menyimpan...</div>}
              {successMessage && <div className="text-green-600">{successMessage}</div>}
            </div>
            {!successMessage && (
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setModalOpen(false)}>Batal</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveEdit}>Simpan</button>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={!!confirmDeleteRow} onClose={() => setConfirmDeleteRow(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <Dialog.Title className="text-lg font-bold text-red-600">Konfirmasi Hapus</Dialog.Title>
            <p>Yakin ingin menghapus baris ini?</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setConfirmDeleteRow(null)}>Batal</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={confirmDelete}>Hapus</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
