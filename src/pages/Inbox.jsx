import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SPREADSHEET_ID = '1JNFMxWz-0A7QUKWOcNlxn_Yb4xlyNOlnBRnJd_Bz5qA';
const API_KEY = 'AIzaSyCbNzhNcPN9LCXXkA3umLutrRJkLj6TkFs';
const RANGE = 'INBOX2!A:F';

const Inbox = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    async function fetchInbox() {
      const res = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`
      );
      const rows = res.data.values || [];
      setData(rows.slice(1));
    }
    fetchInbox();
  }, []);

  const filtered = data.filter(
    row =>
      row[3]?.toLowerCase().includes(search.toLowerCase()) ||
      row[4]?.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Disalin ke clipboard!');
  };

  const hapusPesan = async (isi, index) => {
    const konfirm = confirm('Yakin ingin menghapus pesan ini?');
    if (!konfirm) return;
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: isi })
    });
    const json = await res.json();
    alert(json.message || 'Dihapus!');
    const baru = [...data];
    baru.splice(index, 1);
    setData(baru);
  };

  const simpanEdit = async (index) => {
    const lama = filtered[index][4];
    const res = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old: lama, new: editValue })
    });
    const json = await res.json();
    alert(json.message || 'Diperbarui!');
    const update = [...data];
    const rowIndex = data.findIndex(r => r[4] === lama);
    if (rowIndex !== -1) update[rowIndex][4] = editValue;
    setData(update);
    setEditingIndex(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Inbox Interaktif</h2>

      <input
        type="text"
        placeholder="Cari nomor atau isi pesan..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 p-2 border border-gray-300 rounded-md w-full max-w-md"
      />

      <div className="overflow-x-auto max-h-[80vh]">
        <table className="table-auto w-full text-sm border border-gray-300 shadow">
          <thead className="bg-blue-600 text-white sticky top-0 z-10">
            <tr>
              <th className="p-3 border border-gray-300 w-1/3 text-left">Keterangan</th>
              <th className="p-3 border border-gray-300 text-left">Isi / URL Gambar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                <td className="align-top p-3 border border-gray-300">
                  <p><strong>Nomor:</strong> {row[3] || '-'}</p>
                  <p><strong>Tipe:</strong> {row[2] || '-'}</p>
                  <p><strong>Waktu:</strong> {row[1] ? new Date(row[1]).toLocaleString('id-ID') : '-'}</p>
                </td>
                <td className="align-top p-3 border border-gray-300">
                  {editingIndex === i ? (
                    <>
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => simpanEdit(i)}
                          className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 rounded border border-green-300"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
                        >
                          Batal
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-line mb-2">{row[4]}</p>
                      {row[5] && row[5].startsWith('http') && (
                        <a
                          href={row[5]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          {row[5]}
                        </a>
                      )}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(row[4])}
                          className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
                        >
                          Salin
                        </button>
                        <button
                          onClick={() => {
                            setEditingIndex(i);
                            setEditValue(row[4]);
                          }}
                          className="text-xs px-3 py-1 bg-yellow-100 hover:bg-yellow-200 rounded border border-yellow-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => hapusPesan(row[4], i)}
                          className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 rounded border border-red-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inbox;
