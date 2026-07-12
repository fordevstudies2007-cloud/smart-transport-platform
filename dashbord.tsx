import { useMemo } from 'react';
import { Truck, CheckCircle2, Wrench, Route, Clock, Users, Gauge, DollarSign } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/ui/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { BarChart, LineChart, DonutChart, ProgressBar } from '../components/charts/Charts';
import { formatCurrency, formatNumber, formatPercent } from '../lib/format';

export function DashboardPage() {
  const { vehicles, drivers, trips, fuelLogs, maintenance } = useStore();
  const { user } = useAuth();

  const stats = useMemo(() => {
    const activeVehicles = vehicles.filter((v) => v.status === 'On Trip').length;
    const availableVehicles = vehicles.filter((v) => v.status === 'Available').length;
    const inMaintenance = vehicles.filter((v) => v.status === 'In Shop').length;
    const activeTrips = trips.filter((t) => t.status === 'Dispatched').length;
    const pendingTrips = trips.filter((t) => t.status === 'Draft').length;
    const driversOnDuty = drivers.filter((d) => d.status === 'On Trip').length;
    const operational = vehicles.filter((v) => v.status !== 'Retired').length;
    const utilization = operational ? ((activeVehicles / operational) * 100) : 0;
    return { activeVehicles, availableVehicles, inMaintenance, activeTrips, pendingTrips, driversOnDuty, utilization };
  }, [vehicles, drivers, trips]);

  const vehicleStatusData = useMemo(() => {
    const colors = { 'Available': '#10b981', 'On Trip': '#3b82f6', 'In Shop': '#f59e0b', 'Retired': '#94a3b8' };
    return (['Available', 'On Trip', 'In Shop', 'Retired'] as const).map((s) => ({
      label: s,
      value: vehicles.filter((v) => v.status === s).length,
      color: colors[s],
    }));
  }, [vehicles]);

  const monthlyFuel = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    return months.map((m, i) => ({
      label: m,
      value: Math.round(3000 + Math.sin(i * 0.8) * 800 + i * 200 + fuelLogs.filter((f) => f.date.slice(5, 7) === `0${i + 1}`.slice(-2)).reduce((s, f) => s + f.cost, 0)),
    }));
  }, [fuelLogs]);

  const operationalCost = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    return months.map((m, i) => ({
      label: m,
      value: Math.round(8000 + Math.cos(i * 0.5) * 1500 + i * 400),
    }));
  }, []);

  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalMaintenanceCost = maintenance.filter((m) => m.status === 'Completed').reduce((s, m) => s + m.cost, 0);
  const totalOpCost = totalFuelCost + totalMaintenanceCost;

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.name.split(' ')[0]}`} description="Real-time overview of your fleet operations." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Vehicles" value={stats.activeVehicles} icon={Truck} tone="blue" trend={{ value: '+12%', up: true }} delay={0} />
        <KpiCard label="Available Vehicles" value={stats.availableVehicles} icon={CheckCircle2} tone="green" trend={{ value: '+5%', up: true }} delay={60} />
        <KpiCard label="In Maintenance" value={stats.inMaintenance} icon={Wrench} tone="amber" delay={120} />
        <KpiCard label="Active Trips" value={stats.activeTrips} icon={Route} tone="blue" trend={{ value: '+8%', up: true }} delay={180} />
        <KpiCard label="Pending Trips" value={stats.pendingTrips} icon={Clock} tone="amber" delay={240} />
        <KpiCard label="Drivers On Duty" value={stats.driversOnDuty} icon={Users} tone="green" delay={300} />
        <KpiCard label="Fleet Utilization" value={formatPercent(stats.utilization)} icon={Gauge} tone="purple" trend={{ value: '+3.2%', up: true }} delay={360} />
        <KpiCard label="Total Op. Cost" value={formatCurrency(totalOpCost)} icon={DollarSign} tone="red" trend={{ value: '-2%', up: false }} delay={420} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 animate-slide-up">
          <CardHeader title="Operational Cost" subtitle="Monthly trend across all operations" />
          <div className="p-5">
            <LineChart data={operationalCost} height={220} color="#3b82f6" formatValue={(v) => `$${(v / 1000).toFixed(1)}k`} />
          </div>
        </Card>
        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader title="Vehicle Status" subtitle="Current fleet distribution" />
          <div className="p-5 flex items-center justify-center">
            <DonutChart data={vehicleStatusData} centerValue={String(vehicles.length)} centerLabel="Total" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-slide-up">
          <CardHeader title="Monthly Fuel Cost" subtitle="Last 7 months" />
          <div className="p-5">
            <BarChart data={monthlyFuel} height={200} formatValue={(v) => `$${formatNumber(v)}`} />
          </div>
        </Card>
        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader title="Fleet Utilization" subtitle="By vehicle type" />
          <div className="p-5 space-y-4">
            {['Truck', 'Van', 'Refrigerated', 'Flatbed', 'Tanker', 'Trailer'].map((type, i) => {
              const total = vehicles.filter((v) => v.type === type).length;
              const active = vehicles.filter((v) => v.type === type && v.status === 'On Trip').length;
              const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
              return <ProgressBar key={type} label={type} value={active} max={total || 1} color={colors[i]} />;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
