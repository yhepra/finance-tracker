import React, { useState, useEffect } from 'react';
import { 
    ShieldHalf, 
    Library, 
    LayoutGrid, 
    Book, 
    ArrowRight,
    Users,
    Database,
    Zap,
    MessageSquare,
    Megaphone,
    X,
    Star,
    Mail,
    UserCheck,
    Calendar,
    Clock
} from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [role, _setRole] = useState(localStorage.getItem('auth_role'));

    useEffect(() => {
        if (role !== 'Admin') {
            navigate('/dashboard');
        }
    }, [role, navigate]);

    const [activeView, setActiveView] = useState(null); // null, 'users', 'feedback', 'logs'
    const [users, setUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastSeverity, setBroadcastSeverity] = useState('info');
    const [broadcastActionUrl, setBroadcastActionUrl] = useState('');
    const [broadcastSending, setBroadcastSending] = useState(false);
    const [broadcastSuccess, setBroadcastSuccess] = useState('');
    const [broadcastError, setBroadcastError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const loadUsers = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/admin/users');
            setUsers(res.data.data || []);
            setActiveView('users');
        } catch {
            setError('Gagal memuat list user.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadFeedbacks = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/admin/feedbacks');
            setFeedbacks(res.data.data || []);
            setActiveView('feedback');
        } catch {
            setError('Gagal memuat feedback.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadLogs = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/admin/logs');
            setLogs(res.data.data || []);
            setActiveView('logs');
        } catch {
            setError('Gagal memuat log aktivitas.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadBroadcasts = async () => {
        setIsLoading(true);
        setError('');
        setBroadcastError('');
        setBroadcastSuccess('');
        try {
            const res = await axios.get('/api/admin/broadcasts');
            setBroadcasts(res.data.data || []);
            setActiveView('broadcast');
        } catch {
            setError('Gagal memuat riwayat broadcast.');
        } finally {
            setIsLoading(false);
        }
    };

    const sendBroadcast = async () => {
        setBroadcastError('');
        setBroadcastSuccess('');

        const title = (broadcastTitle || '').trim();
        const message = (broadcastMessage || '').trim();
        const severity = (broadcastSeverity || 'info').trim().toLowerCase();
        const actionUrl = (broadcastActionUrl || '').trim();

        if (!title) {
            setBroadcastError('Judul pengumuman wajib diisi.');
            return;
        }
        if (!message) {
            setBroadcastError('Isi pengumuman wajib diisi.');
            return;
        }

        setBroadcastSending(true);
        try {
            const res = await axios.post('/api/admin/broadcasts', {
                title,
                message,
                severity,
                actionUrl: actionUrl ? actionUrl : null
            });

            const created = res.data?.data;
            if (created) {
                setBroadcasts(prev => [{ ...created, readCount: 0 }, ...prev]);
            }
            setBroadcastTitle('');
            setBroadcastMessage('');
            setBroadcastActionUrl('');
            setBroadcastSeverity('info');
            setBroadcastSuccess(res.data?.message || 'Broadcast berhasil dikirim.');
        } catch (err) {
            setBroadcastError(err?.response?.data?.message || 'Gagal mengirim broadcast.');
        } finally {
            setBroadcastSending(false);
        }
    };

    if (role !== 'Admin') return null;

    const masterDataCards = [
        {
            title: 'Manajemen Bank',
            desc: 'Tambah, edit, atau nonaktifkan bank yang didukung untuk scan rekening koran.',
            icon: <Library className="text-blue-600" size={32} />,
            path: '/settings/banks',
            color: 'bg-blue-50'
        },
        {
            title: 'Kategori Transaksi',
            desc: 'Kelola kategori global yang digunakan oleh seluruh pengguna aplikasi.',
            icon: <LayoutGrid className="text-indigo-600" size={32} />,
            path: '/settings/categories',
            color: 'bg-indigo-50'
        },
        {
            title: 'Direktori Istilah',
            desc: 'Master data untuk pemetaan kata kunci dan lokalisasi istilah sistem.',
            icon: <Book className="text-violet-600" size={32} />,
            path: '/settings/directory',
            color: 'bg-violet-50'
        },
        {
            title: 'User Management',
            desc: 'Daftar pengguna terdaftar (masked) dan pantau status akun sistem.',
            icon: <Users className="text-amber-600" size={32} />,
            action: loadUsers,
            color: 'bg-amber-50'
        },
        {
            title: 'Umpan Balik',
            desc: 'Lihat rating dan komentar dari pengguna untuk perbaikan aplikasi.',
            icon: <MessageSquare className="text-emerald-600" size={32} />,
            action: loadFeedbacks,
            color: 'bg-emerald-50'
        },
        {
            title: 'Log Aktivitas',
            desc: 'Pantau log transaksi, system event, dan error log secara real-time.',
            icon: <Clock className="text-rose-600" size={32} />,
            action: loadLogs,
            color: 'bg-rose-50'
        },
        {
            title: 'Broadcast Pengumuman',
            desc: 'Kirim pengumuman ke semua user dan tampilkan di Notifikasi.',
            icon: <Megaphone className="text-blue-600" size={32} />,
            action: loadBroadcasts,
            color: 'bg-blue-50'
        }
    ];

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto py-4 sm:py-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                        <ShieldHalf size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Admin Control Panel</h1>
                        <p className="text-slate-500 font-medium">Pusat kendali data master dan konfigurasi sistem Alokasi.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-10 sm:mb-12">
                    {masterDataCards.map((card, i) => (
                        <div 
                            key={i}
                            onClick={() => card.path ? navigate(card.path) : card.action()}
                            className="group bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-50 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className={`w-16 h-16 ${card.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                {card.icon}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">{card.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">{card.desc}</p>
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                {card.path ? 'Kelola Data' : 'Buka List'}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* Modal for Lists */}
            {activeView && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setActiveView(null)}></div>
                    <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${
                                    activeView === 'users' ? 'bg-amber-100/50 text-amber-600' : 
                                    activeView === 'logs' ? 'bg-rose-100/50 text-rose-600' :
                                    activeView === 'broadcast' ? 'bg-blue-100/50 text-blue-600' :
                                    'bg-emerald-100/50 text-emerald-600'
                                }`}>
                                    {activeView === 'users' ? <Users size={24} /> : 
                                     activeView === 'logs' ? <Clock size={24} /> :
                                     activeView === 'broadcast' ? <Megaphone size={24} /> :
                                     <MessageSquare size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 leading-none">
                                        {activeView === 'users' ? 'User Management' : 
                                         activeView === 'logs' ? 'Activity & Error Log' :
                                         activeView === 'broadcast' ? 'Broadcast Pengumuman' :
                                         'Daftar Umpan Balik'}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                                        Total: {
                                            activeView === 'users' ? users.length : 
                                            activeView === 'logs' ? logs.length :
                                            activeView === 'broadcast' ? broadcasts.length :
                                            feedbacks.length
                                        } data
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setActiveView(null)}
                                className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-4 sm:p-8">
                            {isLoading ? (
                                <div className="h-64 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-4 font-bold text-slate-500">Memuat data...</p>
                                </div>
                            ) : error ? (
                                <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center font-bold">{error}</div>
                            ) : activeView === 'broadcast' ? (
                                <div className="space-y-6">
                                    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
                                        <div className="flex items-center justify-between gap-4 mb-5">
                                            <div>
                                                <div className="text-sm font-black text-slate-900">Kirim Pengumuman</div>
                                                <div className="text-xs text-slate-500 font-medium">Pengumuman ini akan masuk ke notifikasi semua user.</div>
                                            </div>
                                        </div>

                                        {broadcastError ? (
                                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100">
                                                {broadcastError}
                                            </div>
                                        ) : null}
                                        {broadcastSuccess ? (
                                            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold border border-emerald-100">
                                                {broadcastSuccess}
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Judul</label>
                                                <input
                                                    type="text"
                                                    value={broadcastTitle}
                                                    onChange={(e) => setBroadcastTitle(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                    placeholder="Contoh: Maintenance sistem malam ini"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Isi Pengumuman</label>
                                                <textarea
                                                    value={broadcastMessage}
                                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                                    className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                    placeholder="Tulis detail pengumuman untuk semua user..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Severity</label>
                                                <select
                                                    value={broadcastSeverity}
                                                    onChange={(e) => setBroadcastSeverity(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="info">Info</option>
                                                    <option value="success">Success</option>
                                                    <option value="warning">Warning</option>
                                                    <option value="error">Error</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Action URL (Opsional)</label>
                                                <input
                                                    type="text"
                                                    value={broadcastActionUrl}
                                                    onChange={(e) => setBroadcastActionUrl(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                    placeholder="/dashboard atau /budget"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-5 flex items-center justify-end gap-3">
                                            <button
                                                onClick={sendBroadcast}
                                                disabled={broadcastSending}
                                                className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {broadcastSending ? 'Mengirim...' : 'Kirim Broadcast'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden">
                                        <div className="px-5 sm:px-7 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <div className="text-sm font-black text-slate-900">Riwayat Broadcast</div>
                                            <button
                                                onClick={loadBroadcasts}
                                                className="text-xs font-black text-blue-600 hover:text-blue-800"
                                            >
                                                Refresh
                                            </button>
                                        </div>

                                        <div className="p-4 sm:p-7 space-y-3">
                                            {broadcasts.map(b => (
                                                <div key={b.id} className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900">{b.title}</div>
                                                            <div className="text-xs text-slate-500 font-medium mt-1 whitespace-pre-line">{b.message}</div>
                                                            {b.actionUrl ? (
                                                                <div className="mt-2 text-[11px] font-bold text-slate-500">
                                                                    Action: <span className="font-mono">{b.actionUrl}</span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                {b.severity}
                                                            </div>
                                                            <div className="mt-1 text-[11px] font-bold text-slate-700">
                                                                {new Date(b.createdAtUtc).toLocaleString()}
                                                            </div>
                                                            <div className="mt-1 text-[10px] text-slate-400 font-bold">
                                                                Read {b.readCount || 0}/{b.recipients || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {!broadcasts.length ? (
                                                <div className="py-10 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">
                                                    Belum ada broadcast.
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : activeView === 'users' ? (
                                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse bg-white min-w-[860px]">
                                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">User Info</th>
                                                <th className="p-4">Email (Masked)</th>
                                                <th className="p-4 text-center">Role</th>
                                                <th className="p-4 text-center">Verified</th>
                                                <th className="p-4 text-right">Joined At</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {users.map(u => (
                                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-900">{u.fullName}</div>
                                                        <div className="text-xs text-slate-400 font-medium">ID: #{u.id}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2 text-slate-600 font-mono text-xs bg-slate-100/50 px-2 py-1 rounded-md w-fit border border-slate-200/50">
                                                            <Mail size={12} className="text-slate-400" />
                                                            {u.email}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${u.role === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {u.isEmailVerified ? (
                                                            <div className="flex items-center justify-center gap-1 text-emerald-600">
                                                                <UserCheck size={14} />
                                                            </div>
                                                        ) : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="text-slate-700 text-xs font-bold">{new Date(u.createdAtUtc).toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium lowercase tracking-tighter">
                                                            {new Date(u.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            ) : activeView === 'logs' ? (
                                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse bg-white min-w-[760px]">
                                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="p-4">Time</th>
                                                <th className="p-4">Level & Cat</th>
                                                <th className="p-4">User</th>
                                                <th className="p-4">Message / IP</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {logs.map(l => (
                                                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="text-xs font-bold text-slate-900">{new Date(l.createdAtUtc).toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(l.createdAtUtc).toLocaleTimeString()}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                l.level === 'Error' ? 'bg-red-100 text-red-700' :
                                                                l.level === 'Warning' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {l.level}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                {l.category}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{l.userFullName || l.userEmail}</div>
                                                        <div className="text-[9px] text-slate-400 font-mono tracking-tighter">{l.userEmail}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-xs text-slate-900 font-medium mb-1 line-clamp-2" title={l.message}>
                                                            {l.message}
                                                        </div>
                                                        {l.detail ? (
                                                            <div className="text-[10px] text-slate-500 font-medium line-clamp-2" title={l.detail}>
                                                                {l.detail}
                                                            </div>
                                                        ) : null}
                                                        {l.ipAddress && (
                                                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                                                                <Zap size={8} />
                                                                {l.ipAddress}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {!logs.length && <tr><td colSpan="4" className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">Belum ada log tercatat.</td></tr>}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {feedbacks.map(f => (
                                        <div key={f.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-colors">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 text-xs font-black bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900">
                                                    <Star size={12} className="text-amber-400 fill-amber-400" />
                                                    {f.rating}/5
                                                </div>
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${f.category === 'Bug' ? 'bg-red-100 text-red-700' : f.category === 'FeatureRequest' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {f.category}
                                                </span>
                                            </div>
                                            <p className="text-slate-800 text-sm font-medium leading-relaxed mb-6 italic italic-slate-500">
                                                "{f.comment || 'Tidak ada komentar.'}"
                                            </p>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-[10px] font-black uppercase">
                                                        {f.userFullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-slate-900 leading-none">{f.userFullName}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium mt-1">{f.userEmail}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        <Calendar size={10} />
                                                        {new Date(f.createdAtUtc).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {!feedbacks.length && <div className="col-span-2 py-20 text-center font-bold text-slate-400 uppercase tracking-widest text-sm">Belum ada feedback masuk.</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
