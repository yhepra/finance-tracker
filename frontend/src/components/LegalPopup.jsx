import React from 'react'
import { ShieldCheck, X } from 'lucide-react'

const Title = ({ children }) => <div className="text-xl font-black text-slate-900 tracking-tight">{children}</div>
const SectionTitle = ({ children }) => <div className="text-sm font-black text-slate-900 uppercase tracking-widest">{children}</div>
const Paragraph = ({ children }) => <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
const List = ({ children }) => <ul className="mt-3 space-y-2 text-sm text-slate-600 leading-relaxed list-disc pl-5">{children}</ul>

const contentByType = {
  terms: {
    title: 'Syarat & Ketentuan',
    sections: [
      {
        title: 'Ringkasan',
        body: (
          <>
            <Paragraph>
              Dengan menggunakan FinTrack, Anda setuju mengikuti syarat ini. Jika tidak setuju, hentikan penggunaan layanan.
            </Paragraph>
            <List>
              <li>Anda bertanggung jawab atas aktivitas akun Anda.</li>
              <li>Jangan unggah data yang tidak Anda miliki haknya.</li>
              <li>Jangan gunakan layanan untuk aktivitas ilegal.</li>
            </List>
          </>
        ),
      },
      {
        title: 'Akun & Akses',
        body: (
          <>
            <List>
              <li>Anda wajib memberikan email yang valid dan menjaga keamanan akses (kata sandi/Google).</li>
              <li>Kami dapat menangguhkan akun jika terdeteksi penyalahgunaan atau risiko keamanan.</li>
              <li>Kami dapat melakukan pembaruan fitur tanpa pemberitahuan sebelumnya.</li>
            </List>
          </>
        ),
      },
      {
        title: 'Konten & Data',
        body: (
          <>
            <List>
              <li>Anda tetap pemilik data yang Anda unggah/masukkan.</li>
              <li>Anda memberi izin kepada FinTrack untuk memproses data agar fitur bekerja (misalnya, scan PDF, analitik, laporan).</li>
              <li>Anda tidak boleh mengunggah file yang mengandung program berbahaya atau mengganggu sistem.</li>
            </List>
          </>
        ),
      },
      {
        title: 'Batasan Tanggung Jawab',
        body: (
          <>
            <Paragraph>
              FinTrack membantu pencatatan dan analitik, namun bukan pengganti nasihat profesional. Kami tidak menjamin hasil AI selalu 100% akurat. Penggunaan layanan ini sepenuhnya menjadi risiko Anda.
            </Paragraph>
          </>
        ),
      },
    ],
  },
  privacy: {
    title: 'Kebijakan Privasi',
    sections: [
      {
        title: 'Data Yang Dikumpulkan',
        body: (
          <>
            <List>
              <li>Identitas akun: email, nama (jika tersedia).</li>
              <li>Data keuangan yang Anda input/unggah (contoh: transaksi, saldo awal, rekening koran PDF).</li>
              <li>Data teknis minimal untuk operasional (contoh: token autentikasi).</li>
            </List>
          </>
        ),
      },
      {
        title: 'Cara Kami Menggunakan Data',
        body: (
          <>
            <List>
              <li>Menjalankan fitur inti: pencatatan, analitik, laporan, dan scan rekening koran.</li>
              <li>Keamanan dan pencegahan penyalahgunaan.</li>
              <li>Peningkatan kualitas fitur berdasarkan masukan pengguna.</li>
            </List>
          </>
        ),
      },
      {
        title: 'Penyimpanan & Keamanan',
        body: (
          <>
            <Paragraph>
              FinTrack menerapkan langkah-langkah keamanan untuk melindungi data Anda. Akses dilindungi dengan autentikasi, dan data
              hanya dipakai untuk kebutuhan layanan.
            </Paragraph>
          </>
        ),
      },
    ],
  },
}

export default function LegalPopup({ open, type, onClose }) {
  if (!open) return null
  const content = contentByType[type] || contentByType.terms

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
              <ShieldCheck size={20} />
            </div>
            <Title>{content.title}</Title>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-auto space-y-8">
          {content.sections.map((s) => (
            <div key={s.title} className="space-y-3">
              <SectionTitle>{s.title}</SectionTitle>
              <div>{s.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
