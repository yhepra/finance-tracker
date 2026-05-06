import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
    Home, 
    Wallet, 
    Camera, 
    PlusCircle, 
    Calendar, 
    ArrowRightLeft, 
    PiggyBank,
    BarChart3, 
    Settings,
    ChevronsLeft, 
    Menu, 
    User,
    ShieldHalf,
    X
} from 'lucide-react';
import { t } from '../i18n';
import FeedbackModal from '../components/FeedbackModal';
import NotificationBell from '../components/NotificationBell';


const DashboardLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [tourIndex, setTourIndex] = useState(0);
    const [tourRect, setTourRect] = useState(null);
    const [i18nTick, setI18nTick] = useState(0);
    const [email, setEmail] = useState(localStorage.getItem('auth_email') || '');
    const [name, setName] = useState(localStorage.getItem('auth_name') || '');
    const [role, setRole] = useState(localStorage.getItem('auth_role') || 'User');
    const displayName = name || email || 'User';
    const tourKey = 'ft_tour_seen_v1';

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) return 'Selamat pagi';
        if (hour >= 11 && hour < 15) return 'Selamat siang';
        if (hour >= 15 && hour < 18) return 'Selamat sore';
        return 'Selamat malam';
    }, []);

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
        const mq = window.matchMedia('(max-width: 1023px)');
        const apply = () => {
            const next = Boolean(mq.matches);
            setIsMobile(next);
            if (!next) setIsMobileSidebarOpen(false);
        };
        apply();
        if (mq.addEventListener) mq.addEventListener('change', apply);
        else mq.addListener(apply);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', apply);
            else mq.removeListener(apply);
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

    const tourSteps = useMemo(() => {
        const steps = [
            {
                id: 'nav',
                title: 'Navigasi',
                body: 'Gunakan menu di sisi kiri untuk berpindah halaman utama.',
                selector: '[data-tour="sidebar"]',
                openSidebar: true
            },
            {
                id: 'scan',
                title: 'Scan Rekening',
                body: 'Upload rekening koran PDF (BCA/BNI/Superbank/Bank Jago). Sistem akan membuat draft transaksi yang bisa Anda koreksi sebelum disimpan.',
                selector: '[data-tour="nav-scan"]',
                openSidebar: true
            },
            {
                id: 'manual',
                title: 'Transaksi Manual',
                body: 'Tambah transaksi secara manual jika tidak menggunakan rekening koran.',
                selector: '[data-tour="nav-manual"]',
                openSidebar: true
            },
            {
                id: 'budget',
                title: 'Budgeting',
                body: 'Atur anggaran per kategori dan pantau progres. Notifikasi dikirim saat melewati ambang 80% dan 100%.',
                selector: '[data-tour="nav-budget"]',
                openSidebar: true
            },
            {
                id: 'settings',
                title: 'Pengaturan',
                body: 'Kelola rekening, kategori, bank, dan integrasi.',
                selector: '[data-tour="nav-settings"]',
                openSidebar: true
            },
            {
                id: 'profile',
                title: 'Menu Profil',
                body: 'Akses feedback, account, dan logout dari menu profil.',
                selector: '[data-tour="profile-menu"]',
                openSidebar: false
            }
        ];

        return steps;
    }, []);

    const closeTour = () => {
        localStorage.setItem(tourKey, '1');
        setIsTourOpen(false);
        setTourRect(null);
        setTourIndex(0);
        setIsMobileSidebarOpen(false);
    };

    const startTour = () => {
        setIsProfileMenuOpen(false);
        setTourIndex(0);
        setIsTourOpen(true);
    };

    useEffect(() => {
        const hasSeen = localStorage.getItem(tourKey);
        const token = localStorage.getItem('auth_token');
        if (hasSeen || !token) return;
        const tmr = window.setTimeout(() => {
            setIsTourOpen(true);
        }, 700);
        return () => window.clearTimeout(tmr);
    }, []);

    useEffect(() => {
        if (!isTourOpen) return;
        const step = tourSteps[tourIndex];
        if (!step) return;

        const run = () => {
            const el = document.querySelector(step.selector);
            if (!el) {
                setTourRect(null);
                return;
            }
            try {
                el.scrollIntoView({ block: 'center', inline: 'center' });
            } catch (e) { void e; }
            const rect = el.getBoundingClientRect();
            const pad = 10;
            setTourRect({
                top: Math.max(0, rect.top - pad),
                left: Math.max(0, rect.left - pad),
                width: Math.min(window.innerWidth, rect.width + pad * 2),
                height: Math.min(window.innerHeight, rect.height + pad * 2),
                radius: 16
            });
        };

        const raf = window.requestAnimationFrame(run);
        const onResize = () => run();
        window.addEventListener('resize', onResize);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
        };
    }, [isTourOpen, tourIndex, tourSteps, isMobile, isSidebarOpen]);

    const navItems = useMemo(() => {
        const v = i18nTick;
        return [
            { name: t('nav.dashboard', 'Dashboard'), icon: <Home size={20} />, path: '/dashboard', v },
            { name: t('nav.monthlyBalance', 'Rekening'), icon: <Wallet size={20} />, path: '/saldo', v },
            { name: t('nav.scan', 'Scan Rekening'), icon: <Camera size={20} />, path: '/scan', v },
            { name: t('nav.manual', 'Transaksi Manual'), icon: <PlusCircle size={20} />, path: '/transaksi', v },
            { name: t('nav.budget', 'Budgeting'), icon: <PiggyBank size={20} />, path: '/budget', v },
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
        localStorage.removeItem('auth_role');
        navigate('/login', { replace: true });
    };
    const tourWantsSidebar = Boolean(isTourOpen && tourSteps[tourIndex]?.openSidebar);
    const desktopSidebarOpen = isSidebarOpen || tourWantsSidebar;
    const effectiveMobileSidebarOpen = isMobile ? (isMobileSidebarOpen || tourWantsSidebar) : false;
    const sidebarExpanded = isMobile ? true : desktopSidebarOpen;

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {effectiveMobileSidebarOpen ? (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
                    onClick={() => {
                        if (tourWantsSidebar) return;
                        setIsMobileSidebarOpen(false);
                    }}
                />
            ) : null}

            <aside
                data-tour="sidebar"
                className={`
                bg-blue-900 text-white transition-all duration-300 flex flex-col
                fixed inset-y-0 left-0 z-50 w-72 transform lg:static lg:translate-x-0
                ${effectiveMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:flex
                ${desktopSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
                `}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800">
                    {sidebarExpanded ? (
                        <div className="flex items-center gap-2">
                            <img src="/logo-icon.png" alt="Alokasi" className="h-8 w-8 object-contain" />
                            <span className="text-xl font-black tracking-tight text-white">Alokasi</span>
                        </div>
                    ) : (
                        <img src="/logo-icon.png" alt="Alokasi" className="h-8 w-8 object-contain mx-auto" />
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (tourWantsSidebar) return;
                            if (isMobile) setIsMobileSidebarOpen(false);
                            else setIsSidebarOpen((v) => !v);
                        }}
                        className="p-1 rounded hover:bg-blue-800"
                        aria-label={isMobile ? 'Tutup menu' : 'Toggle sidebar'}
                    >
                        {isMobile ? <X size={24} /> : desktopSidebarOpen ? <ChevronsLeft size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-auto">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.path}
                            data-tour={
                                item.path === '/scan'
                                    ? 'nav-scan'
                                    : item.path === '/transaksi'
                                    ? 'nav-manual'
                                    : item.path === '/budget'
                                    ? 'nav-budget'
                                    : undefined
                            }
                            onClick={() => {
                                if (isMobile) setIsMobileSidebarOpen(false);
                            }}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                    isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                                } ${!sidebarExpanded && 'justify-center'}`
                            }
                        >
                            {item.icon}
                            {sidebarExpanded && <span className="font-medium">{item.name}</span>}
                        </NavLink>
                    ))}

                    {role === 'Admin' && (
                        <div className="mt-4 pt-4 border-t border-blue-800/50">
                            <NavLink
                                to="/admin"
                                data-tour="nav-admin"
                                onClick={() => {
                                    if (isMobile) setIsMobileSidebarOpen(false);
                                }}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                        isActive ? 'bg-amber-500 text-white' : 'bg-blue-800/30 text-amber-200 hover:bg-amber-500 hover:text-white'
                                    } ${!sidebarExpanded && 'justify-center'}`
                                }
                            >
                                <ShieldHalf size={20} />
                                {sidebarExpanded && <span className="font-bold">Admin Panel</span>}
                            </NavLink>
                        </div>
                    )}
                </nav>
                <div className="px-3 pb-4">
                    <NavLink
                        to="/settings"
                        data-tour="nav-settings"
                        onClick={() => {
                            if (isMobile) setIsMobileSidebarOpen(false);
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                            } ${!sidebarExpanded && 'justify-center'}`
                        }
                    >
                        <Settings size={20} />
                        {sidebarExpanded && <span className="font-medium">{t('nav.settings', 'Settings')}</span>}
                    </NavLink>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center"
                            onClick={() => setIsMobileSidebarOpen(true)}
                            aria-label="Buka menu"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-800 truncate">
                            {greeting}, {displayName}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <div className="relative" tabIndex={0} onBlur={() => setIsProfileMenuOpen(false)}>
                            <button
                                type="button"
                                onClick={() => setIsProfileMenuOpen((v) => !v)}
                                className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center hover:bg-indigo-700"
                                aria-label="Profile menu"
                                data-tour="profile-menu"
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
                                        onClick={startTour}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        Tur Singkat
                                    </button>
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
                    </div>
                </header>

                <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 bg-slate-50 shrink-0">
                    <div className="max-w-full overflow-x-auto">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-200/50 backdrop-blur-sm px-3 py-2 text-sm text-slate-700 border border-slate-200/40 whitespace-nowrap">
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
                </div>

                <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 pt-0">
                    {children}
                </div>
            </main>

            {isTourOpen ? (
                <div className="fixed inset-0 z-[200]">
                    {tourRect ? (
                        <div
                            className="fixed"
                            style={{
                                top: tourRect.top,
                                left: tourRect.left,
                                width: tourRect.width,
                                height: tourRect.height,
                                borderRadius: tourRect.radius,
                                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)',
                                border: '2px solid rgba(255, 255, 255, 0.7)'
                            }}
                        />
                    ) : (
                        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
                    )}

                    <div className={`fixed ${isMobile ? 'left-4 right-4 bottom-4' : 'right-6 bottom-6'} max-w-[520px]`}>
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                <div className="min-w-0">
                                    <div className="text-xs font-black uppercase tracking-widest text-blue-700">
                                        Tur {tourIndex + 1}/{tourSteps.length}
                                    </div>
                                    <div className="text-base font-black text-slate-900 tracking-tight truncate">
                                        {tourSteps[tourIndex]?.title}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeTour}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
                                    aria-label="Tutup tur"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="px-5 py-4">
                                <div className="text-sm font-medium text-slate-700 leading-relaxed">
                                    {tourSteps[tourIndex]?.body}
                                </div>
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={closeTour}
                                        className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50"
                                    >
                                        Lewati
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={tourIndex === 0}
                                            onClick={() => setTourIndex((x) => Math.max(0, x - 1))}
                                            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                                        >
                                            Kembali
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = tourIndex + 1;
                                                if (next >= tourSteps.length) closeTour();
                                                else setTourIndex(next);
                                            }}
                                            className="h-10 px-4 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800"
                                        >
                                            {tourIndex + 1 >= tourSteps.length ? 'Selesai' : 'Lanjut'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </div>
    );
};

export default DashboardLayout;
