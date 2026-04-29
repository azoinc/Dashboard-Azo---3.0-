/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExpenseProvider } from './context/ExpenseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout, TabType } from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import CommercialEntry from './pages/CommercialEntry';
import CommercialPipeline from './pages/CommercialPipeline';
import CommercialVisits from './pages/CommercialVisits';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import InstitucionalEntry from './pages/InstitucionalEntry';
import Timeline from './pages/Timeline';
import DashboardSelection from './pages/DashboardSelection';
import InternoDashboard from './pages/InternoDashboard';
import { TransactionModal } from './components/TransactionModal';
import { CommercialModal } from './components/CommercialModal';

const AppContent = () => {
  const { user, loading, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDashboard, setSelectedDashboard] = useState<'comercial' | 'interno' | 'gdash' | null>(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const canSelectDashboard = ['MASTER', 'ADMINISTRATIVO', 'FUNCIONARIO_RJ', 'FUNCIONARIO_CAMPINAS'].includes(userRole || '');

  if (canSelectDashboard && !selectedDashboard) {
    return <DashboardSelection onSelect={setSelectedDashboard} />;
  }

  if (selectedDashboard === 'interno') {
    return <InternoDashboard onBack={() => setSelectedDashboard(null)} />;
  }


  return (
    <ExpenseProvider>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onBackToSelection={canSelectDashboard ? () => setSelectedDashboard(null) : undefined}
      >
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'entry' && <DataEntry />}
        {activeTab === 'commercial_sales' && <CommercialEntry />}
        {activeTab === 'commercial_pipeline' && <CommercialPipeline />}
        {activeTab === 'commercial_visits' && <CommercialVisits />}
        {activeTab === 'institucional' && <InstitucionalEntry />}
        {activeTab === 'timeline' && <Timeline />}
        {activeTab === 'admin' && userRole === 'MASTER' && <AdminPanel />}
      </Layout>
      <TransactionModal activeTab={activeTab as any} />
      <CommercialModal />
    </ExpenseProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
