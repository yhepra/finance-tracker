import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    ChevronRight, 
    ShieldCheck, 
    TrendingUp, 
    PieChart, 
    Wallet, 
    Zap, 
    Globe, 
    Lock, 
    Cpu,
    ArrowRight
} from 'lucide-react';
import LegalPopup from '../components/LegalPopup';

export default function LandingPage() {
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalType, setLegalType] = useState('terms');

  const openLegal = (type) => {
    setLegalType(type);
    setLegalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 scroll-smooth px-2 md:px-0">
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50/50 blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center space-x-2 group cursor-pointer">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                    <Wallet size={20} />
                </div>
                <span className="text-2xl font-black tracking-tighter">
                    Fin<span className="text-blue-600">Track</span>
                </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-10 text-sm font-semibold text-slate-600">
                <a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur Utama</a>
                <a href="#tentang" className="hover:text-blue-600 transition-colors">Tentang Kami</a>

                <button type="button" onClick={() => openLegal('terms')} className="hover:text-blue-600 transition-colors">
                    Syarat
                </button>
                <Link to="/login" className="hover:text-blue-600 transition-colors">Masuk</Link>
            </div>

            <Link 
                to="/register" 
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
            >
                Mulai Gratis
                <ArrowRight size={16} />
            </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50/80 backdrop-blur-sm border border-blue-100 px-4 py-2 rounded-2xl text-blue-700 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
                <Zap size={14} className="fill-blue-700" />
                Ditenagai AI Gemini Flash 2.0
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tight leading-[0.9] mb-8">
                Automasi <br className="hidden md:block"/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600">Keuangan Anda.</span>
            </h1>
            
            <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                Satu aplikasi untuk kendali total. Scan rekening koran BCA, BNI, dan Superbank secara otomatis, data Anda aman, dan kelola arus kas dengan cerdas.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                <Link 
                    to="/register" 
                    className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-2xl shadow-blue-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group"
                >
                    Mulai Sekarang
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-2 p-2 px-4 rounded-xl bg-slate-100/50 border border-slate-200/50">
                    <ShieldCheck size={18} className="text-green-600" />
                    <span className="text-sm font-bold text-slate-600 italic">Data terenkripsi AES-CBC</span>
                </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-3 text-sm">

                <button
                    type="button"
                    onClick={() => openLegal('terms')}
                    className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                    Syarat &amp; Ketentuan
                </button>
            </div>
        </div>

        {/* Real Feature Preview */}
        <div className="container mx-auto px-6 mt-20 relative">
            <div className="relative mx-auto max-w-5xl rounded-[2.5rem] border-8 border-slate-900/5 bg-slate-900/5 p-4 backdrop-blur-3xl overflow-hidden shadow-2xl">
                <div className="rounded-[1.5rem] bg-white border border-white/20 shadow-inner overflow-hidden aspect-[16/9] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white p-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
                        <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-600 text-white rounded-lg"><Cpu size={20}/></div>
                                <span className="font-black text-blue-900 uppercase tracking-tighter">Gemini Intelligence</span>
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 mb-2">Automasi Bank Statement</h4>
                            <p className="text-slate-500 font-medium">Upload mutasi PDF Anda dari BCA, BNI, atau Superbank. Sistem secara otomatis mengekstrak transaksi dan mencocokkan nomor rekening secara presisi.</p>
                        </div>
                        <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-600 text-white rounded-lg"><Lock size={20}/></div>
                                <span className="font-black text-indigo-900 uppercase tracking-tighter">Security Standards</span>
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 mb-2">Enkripsi At-Rest</h4>
                            <p className="text-slate-500 font-medium">Kami menjamin privasi Anda. Semua data PII (Personal Identifiable Information) dienkripsi transparan di tingkat database.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-32 bg-slate-50 relative">
        <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-20">
                <div className="max-w-2xl">
                    <div className="text-blue-600 font-black text-sm uppercase tracking-widest mb-4">Fitur Premium</div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">Keamanan data tanpa kompromi, efisiensi tanpa batas.</h2>
                </div>
                <div className="hidden md:block">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                        <Globe size={20} className="text-blue-600" />
                        <span className="text-sm font-bold text-slate-700">Akses kapan saja, di mana saja.</span>
                    </div>
                </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                {[
                    {
                        title: "Transparent Encryption",
                        desc: "Semua data personal dan finansial dienkrpsi menggunakan AES-CBC sebelum menyentuh database.",
                        icon: <Lock className="text-blue-600" size={28} />,
                        bg: "bg-blue-50"
                    },
                    {
                        title: "AI Bank Statement Scan",
                        desc: "Upload PDF mutasi Anda dari BCA, BNI, atau Superbank. Biarkan AI membaca transaksi dan saldo awal secara instan.",
                        icon: <Cpu className="text-indigo-600" size={28} />,
                        bg: "bg-indigo-50"
                    },
                    {
                        title: "Real-time Analytics",
                        desc: "Lihat visualisasi arus kas Anda. Pantau pengeluaran vs pemasukan lintas akun secara visual.",
                        icon: <TrendingUp className="text-violet-600" size={28} />,
                        bg: "bg-violet-50"
                    }
                ].map((f, i) => (
                    <div key={i} className="group bg-white p-10 rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-50 transition-all duration-500">
                        <div className={`w-16 h-16 ${f.bg} rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform`}>
                            {f.icon}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter">{f.title}</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* About Section */}
      <section id="tentang" className="py-32 overflow-hidden border-t border-slate-100">
        <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
                <div className="relative">
                    <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl"></div>
                    <div className="relative bg-slate-900 rounded-[3rem] p-12 text-white">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <pre className="text-xs md:text-sm font-mono text-blue-300 leading-relaxed overflow-x-auto">
{`{
  "misi": "Meningkatkan Literasi Finansial",
  "teknologi": ["React", ".NET", "AI"],
  "keamanan": "Enkripsi Data",
  "privasi": true,
  "pengembang": "Tim Antigravity"
}`}
                        </pre>
                    </div>
                </div>
                
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tighter">Lebih dari sekadar <br/> pelacak uang.</h2>
                    <p className="text-lg text-slate-600 leading-relaxed mb-8">
                        FinTrack lahir dari visi untuk mendemokratisasi alat manajemen keuangan bagi pengguna personal. Kami mengintegrasikan kecerdasan buatan terbaru untuk membantu Anda mendapatkan wawasan finansial dalam hitungan detik.
                    </p>
                    <ul className="space-y-4">
                        {[
                            "Pencocokan akun cerdas",
                            "Perlindungan data personal",
                            "Optimasi pembacaan PDF perbankan Indonesia",
                            "Desain antarmuka berstandar internasional"
                        ].map((li, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-700 font-bold">
                                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <ShieldCheck size={14} />
                                </div>
                                {li}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
      </section>

      <section className="py-24 border-t border-slate-100 bg-white">
        <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
                <div className="max-w-2xl">
                    <div className="text-blue-600 font-black text-sm uppercase tracking-widest mb-4">Transparansi</div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">Syarat, privasi, dan keamanan dalam satu tempat.</h2>
                </div>
                <div className="text-sm text-slate-500 font-medium max-w-xl">
                    Baca ringkasan kebijakan yang paling sering ditanyakan pengguna. Semua ditampilkan dalam popup agar tetap rapi.
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    type="button"
                    onClick={() => openLegal('terms')}
                    className="text-left bg-slate-50/60 border border-slate-200 rounded-3xl p-8 hover:bg-white hover:shadow-xl hover:shadow-blue-50 transition-all"
                >
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-6">
                        <ArrowRight size={20} />
                    </div>
                    <div className="text-xl font-black text-slate-900 tracking-tight mb-2">Syarat &amp; Ketentuan</div>
                    <div className="text-sm text-slate-500 font-medium leading-relaxed">
                        Aturan penggunaan layanan, hak dan kewajiban, serta batasan tanggung jawab.
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => openLegal('privacy')}
                    className="text-left bg-slate-50/60 border border-slate-200 rounded-3xl p-8 hover:bg-white hover:shadow-xl hover:shadow-blue-50 transition-all"
                >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6">
                        <Lock size={20} />
                    </div>
                    <div className="text-xl font-black text-slate-900 tracking-tight mb-2">Kebijakan Privasi</div>
                    <div className="text-sm text-slate-500 font-medium leading-relaxed">
                        Data apa yang diproses, untuk apa digunakan, dan bagaimana perlindungannya.
                    </div>
                </button>


            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="container mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-8 opacity-60 grayscale hover:grayscale-0 transition-all">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <Wallet size={16} />
                </div>
                <span className="text-xl font-black tracking-tighter">FinTrack</span>
            </div>
            <p className="text-slate-400 text-sm mb-12 max-w-md mx-auto">
                Dibuat dengan dedikasi tinggi oleh Antigravity untuk membantu masyarakat Indonesia lebih literat secara finansial.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm font-bold border-y border-white/5 py-8">
                <button type="button" onClick={() => openLegal('privacy')} className="hover:text-blue-400">Kebijakan Privasi</button>
                <button type="button" onClick={() => openLegal('terms')} className="hover:text-blue-400">Syarat &amp; Ketentuan</button>

                <a href="https://github.com/yhepra" target="_blank" rel="noreferrer" className="hover:text-blue-400">GitHub</a>
                <a href="https://www.linkedin.com/in/yhepra/" target="_blank" rel="noreferrer" className="hover:text-blue-400">LinkedIn</a>
            </div>
            <p className="text-xs text-slate-600 font-mono">
                &copy; {new Date().getFullYear()} FinTrack Personal. Semua Hak Dilindungi.
            </p>
        </div>
      </footer>

      <LegalPopup open={legalOpen} type={legalType} onClose={() => setLegalOpen(false)} />
      
    </div>
  );
}
