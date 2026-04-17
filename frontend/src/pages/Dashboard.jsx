import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout, Settings2, X, Check } from 'lucide-react';
import ReconciliationCard from '../components/cards/ReconciliationCard';
import BudgetProgressCard from '../components/cards/BudgetProgressCard';
import DebtReceivablesCard from '../components/cards/DebtReceivablesCard';
import QuickScanCard from '../components/cards/QuickScanCard';
import YearlyCashFlowCard from '../components/cards/YearlyCashFlowCard';
import DashboardLayout from '../layouts/DashboardLayout';

const DEFAULT_WIDGETS = {
    yearlyChart: { id: 'yearlyChart', label: 'Arus Kas Tahunan', visible: true, colSpan: 2 },
    reconciliation: { id: 'reconciliation', label: 'Status Saldo', visible: true, colSpan: 1 },
    budget: { id: 'budget', label: 'Progres Anggaran', visible: true, colSpan: 1 },
    debt: { id: 'debt', label: 'Hutang & Piutang', visible: true, colSpan: 1 },
    scan: { id: 'scan', label: 'Scan Rekening', visible: true, colSpan: 1 }
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showWidgetSettings, setShowWidgetSettings] = useState(false);
    const [widgets, setWidgets] = useState(() => {
        const saved = localStorage.getItem('dashboard_widgets');
        return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
    });
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem('dashboard_widgets', JSON.stringify(widgets));
    }, [widgets]);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const response = await axios.get('/api/dashboard/stats');
                setStats(response.data.data);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                if (error?.response?.status === 401) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_email');
                    localStorage.removeItem('auth_name');
                    navigate('/login', { replace: true });
                    return;
                }
                // Reset stats to empty if server fails instead of fake data
                setStats({
                    reconciliation: { actualStartBalance: 0, systemCalculatedBalance: 0, difference: 0 },
                    budgetProgresses: [],
                    debtReceivables: { totalReceivables: 0, totalDebts: 0 },
                    yearlyCashFlow: []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, [navigate]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full text-slate-500 font-medium">
                    Loading dashboard data...
                </div>
            </DashboardLayout>
        );
    }

    const toggleWidget = (id) => {
        setWidgets(prev => ({
            ...prev,
            [id]: { ...prev[id], visible: !prev[id].visible }
        }));
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
                        <p className="text-sm font-medium text-slate-500">Ringkasan aktivitas keuangan Anda.</p>
                    </div>
                    <button 
                        onClick={() => setShowWidgetSettings(!showWidgetSettings)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            showWidgetSettings 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                        }`}
                    >
                        <Settings2 size={14} />
                        Atur Widget
                    </button>
                </div>

                {showWidgetSettings && (
                    <div className="mb-8 bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">Kustomisasi Tampilan</h3>
                            <button onClick={() => setShowWidgetSettings(false)} className="text-indigo-400 hover:text-indigo-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {Object.values(widgets).map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => toggleWidget(w.id)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                                        w.visible 
                                        ? 'bg-white text-indigo-600 border-2 border-indigo-500 shadow-md shadow-indigo-100' 
                                        : 'bg-slate-100 text-slate-400 border-2 border-transparent'
                                    }`}
                                >
                                    {w.visible ? <Check size={14} /> : <div className="w-3.5 h-3.5 border-2 border-slate-300 rounded-md" />}
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {widgets.yearlyChart.visible && <YearlyCashFlowCard data={stats?.yearlyCashFlow} />}
                    {widgets.reconciliation.visible && <ReconciliationCard stats={stats?.reconciliation} />}
                    {widgets.budget.visible && <BudgetProgressCard budgets={stats?.budgetProgresses} />}
                    {widgets.debt.visible && <DebtReceivablesCard stats={stats?.debtReceivables} />}
                    {widgets.scan.visible && <QuickScanCard />}
                </div>

                {!Object.values(widgets).some(w => w.visible) && (
                    <div className="py-20 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Layout className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Dashboard Kosong</h3>
                        <p className="text-sm text-slate-500 mt-1">Gunakan tombol "Atur Widget" untuk menampilkan data.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
