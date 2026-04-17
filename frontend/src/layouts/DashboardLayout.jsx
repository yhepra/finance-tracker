import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
    Home, 
    Wallet, 
    Camera, 
    PlusCircle, 
    Calendar, 
    ArrowRightLeft, 
    BarChart3, 
    Settings,
    ChevronsLeft, 
    Menu, 
    User,
    ShieldHalf
} from 'lucide-react';
import { t } from '../i18n';
import FeedbackModal from '../components/FeedbackModal';


const DashboardLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [i18nTick, setI18nTick] = useState(0);
    const [email, setEmail] = useState(localStorage.getItem('auth_email') || '');
    const [name, setName] = useState(localStorage.getItem('auth_name') || '');
    const [role, setRole] = useState(localStorage.getItem('auth_role') || 'User');
    const displayName = name || email || 'User';

    useEffect(() => {
        const sync = () => {
            setEmail(localStorage.getItem('auth_email') || '');
            setName(localStorage.getItem('auth_name') || '');
            setRole(localStorage.getItem('auth_role') || 'User');
        };
        window.addEventListener('storage', sync);
        window.addEventListener('auth-updated', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('auth-updated', sync);
        };
    }, []);

    useEffect(() => {
        const rerender = () => setI18nTick((x) => x + 1);
        window.addEventListener('i18n-updated', rerender);
        window.addEventListener('prefs-updated', rerender);
        return () => {
            window.removeEventListener('i18n-updated', rerender);
            window.removeEventListener('prefs-updated', rerender);
        };
    }, []);

    const initials = useMemo(() => {
        const src = (name || email || 'U').trim();
        const base = src.includes('@') ? src.split('@')[0] : src;
        const parts = base.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        const one = parts[0] || 'U';
        return one.slice(0, 2).toUpperCase();
    }, [email, name]);

    const navItems = useMemo(() => {
        const v = i18nTick;
        return [
            { name: t('nav.dashboard', 'Dashboard'), icon: <Home size={20} />, path: '/dashboard', v },
            { name: t('nav.monthlyBalance', 'Rekening'), icon: <Wallet size={20} />, path: '/saldo', v },
            { name: t('nav.scan', 'Scan Rekening'), icon: <Camera size={20} />, path: '/scan', v },
            { name: t('nav.manual', 'Transaksi Manual'), icon: <PlusCircle size={20} />, path: '/transaksi', v },
            { name: t('nav.recurring', 'Tagihan Rutin'), icon: <Calendar size={20} />, path: '/tagihan', v },
            { name: t('nav.debts', 'Hutang & Piutang'), icon: <ArrowRightLeft size={20} />, path: '/hutang-piutang', v },
            { name: t('nav.reports', 'Laporan'), icon: <BarChart3 size={20} />, path: '/laporan', v }
        ];
    }, [i18nTick]);

    const breadcrumbItems = useMemo(() => {
        const base = [
            { label: 'Dashboard', to: '/dashboard' }
        ];

        const labels = new Map();
        for (const it of navItems) labels.set(it.path, it.name);
        labels.set('/settings', t('settings.title', 'Settings'));
        labels.set('/settings/account', t('settings.title', 'Settings'));

        const path = location.pathname || '/dashboard';
        if (path === '/dashboard') return base;

        const label = labels.get(path);
        if (label) return [...base, { label, to: path }];

        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) return base;
        const last = parts[parts.length - 1];
        const fallback = last
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        return [...base, { label: fallback, to: path }];
    }, [location.pathname, navItems]);

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_name');
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside 
                className={`${isSidebarOpen ? 'w-64' : 'w-20'} 
                bg-blue-900 text-white transition-all duration-300 flex flex-col`}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800">
                    {isSidebarOpen ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-900/40">
                          <Wallet size={16} />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">
                          Fin<span className="text-blue-300">Track</span>
                        </span>
                      </div>
                    ) : null}
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-1 rounded hover:bg-blue-800 ${!isSidebarOpen && 'mx-auto'}`}
                    >
                        {isSidebarOpen ? <ChevronsLeft size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 py-4 flex flex-col gap-2 px-3">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.path}
                            className={({ isActive }) => 
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                    isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                                } ${!isSidebarOpen && 'justify-center'}`
                            }
                        >
                            {item.icon}
                            {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                        </NavLink>
                    ))}

                    {/* Admin Switcher */}
                    {role === 'Admin' && (
                        <div className="mt-4 pt-4 border-t border-blue-800/50">
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => 
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                        isActive ? 'bg-amber-500 text-white' : 'bg-blue-800/30 text-amber-200 hover:bg-amber-500 hover:text-white'
                                    } ${!isSidebarOpen && 'justify-center'}`
                                }
                            >
                                <ShieldHalf size={20} />
                                {isSidebarOpen && <span className="font-bold">Admin Panel</span>}
                            </NavLink>
                        </div>
                    )}
                </nav>
                <div className="px-3 pb-4">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                            } ${!isSidebarOpen && 'justify-center'}`
                        }
                    >
                        <Settings size={20} />
                        {isSidebarOpen && <span className="font-medium">{t('nav.settings', 'Settings')}</span>}
                    </NavLink>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-10 shrink-0">
                    <h2 className="text-xl font-semibold text-slate-800">{t('auth.welcome', 'Welcome')}, {displayName}</h2>
                    <div
                        className="relative"
                        tabIndex={0}
                        onBlur={() => setIsProfileMenuOpen(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setIsProfileMenuOpen((v) => !v)}
                            className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center hover:bg-indigo-700"
                            aria-label="Profile menu"
                        >
                            {initials || <User size={18} />}
                        </button>

                        {isProfileMenuOpen ? (
                            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <div className="text-sm font-semibold text-slate-800 truncate">{displayName}</div>
                                    <div className="text-xs text-slate-500 truncate">{email}</div>
                                </div>
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        setIsFeedbackOpen(true);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    {t('nav.feedback', 'Feedback')}
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => navigate('/settings/account')}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    {t('settings.account', 'Account')}
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={logout}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                >
                                    {t('common.logout', 'Logout')}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </header>

                {/* Breadcrumbs - Now Fixed */}
                <div className="px-8 pt-4 pb-4 bg-slate-50 shrink-0">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-200/50 backdrop-blur-sm px-3 py-2 text-sm text-slate-700 border border-slate-200/40">
                        {breadcrumbItems.map((b, i) => (
                            <React.Fragment key={`${b.to}-${b.label}-${i}`}>
                                {i > 0 ? <span className="text-slate-400">›</span> : null}
                                {i === breadcrumbItems.length - 1 ? (
                                    <span className="font-bold text-slate-900">{b.label}</span>
                                ) : (
                                    <Link to={b.to} className="hover:text-indigo-600 transition-colors">
                                        {b.label}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Page Content - Scrollable */}
                <div className="flex-1 overflow-auto px-8 pb-8 pt-0">
                    {children}
                </div>
            </main>

            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </div>
    );
};

export default DashboardLayout;
