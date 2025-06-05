import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExportList = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchBackupJson() {
      try {
        const url = 'https://drive.google.com/uc?export=download&id=1OZEDBB8nfJHG624nstbHpd05a7JCIebk';
        const res = await axios.get(url, { responseType: 'text' });
        const parsed = JSON.parse(res.data);
        setData(parsed || []);
      } catch (err) {
        console.error('Gagal ambil data ekspor:', err.message);
      }
    }
    fetchBackupJson();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Daftar File Ekspor</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-4 border border-gray-200 hover:shadow-lg transition">
            <h3 className="font-semibold text-lg capitalize text-gray-800">{item.nama}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {item.tanggal || new Date(item.waktu).toLocaleString('id-ID')}
            </p>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-blue-600 font-medium hover:underline"
            >
              Download File
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExportList;
