import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RestoreList = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchDeleted() {
      try {
        const res = await axios.get('https://drive.google.com/uc?export=download&id=ID_JSON_DELETED_BACKUP');
        setData(res.data || []);
      } catch (err) {
        console.error('Gagal ambil data restore:', err.message);
      }
    }
    fetchDeleted();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Data Terhapus (Restore)</h2>
      <ul className="list-decimal pl-4">
        {data.map((item, i) => (
          <li key={i}>
            <p className="text-sm">ID: <code>{item.data[10]}</code> — Nama: {item.data[2]}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RestoreList;