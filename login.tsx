import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { StoreProvider } from './lib/store';
import { ThemeProvider } from './lib/theme';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, Topbar } from './components/layout/Layout';
import { ToastContainer } from './components/ui/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { DriversPage } from './pages/DriversPage';
import { TripsPage } from './pages/TripsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { FuelPage } from './pages/FuelPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  trips: 'Trips',
  maintenance: 'Maintenance',
  fuel: 'Fuel Logs',
  expenses: 'Expenses',
  reports: 'Reports',
  settings: 'Settings',
};

function AppContent() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (current) {
      case 'dashboard': return <DashboardPage />;
      case 'vehicles': return <VehiclesPage />;
      case 'drivers': return <DriversPage />;
      case 'trips': return <TripsPage />;
      case 'maintenance': return <MaintenancePage />;
      case 'fuel': return <FuelPage />;
      case 'expenses': return <ExpensesPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[rgb(var(--bg))]">
      <Sidebar current={current} onNavigate={setCurrent} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={pageTitles[current] || 'Dashboard'} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
