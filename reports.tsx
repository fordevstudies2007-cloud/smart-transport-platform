import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { BarChart, LineChart, DonutChart, ProgressBar } from '../components/charts/Charts';
import { formatCurrency } from '../lib/format';

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { vehicles, fuelLogs, maintenance, trips, expenses } = useStore();

  // Fuel efficiency: liters per 100km per vehicle (approx)
  const fuelEfficiency = useMemo(() => {
    return vehicles.filter((v) => v.status !== 'Retired').map((v) => {
      const fuel = fuelLogs.filter((f) => f.vehicleId === v.id).reduce((s, f) => s + f.quantity, 0);
      const distance = trips.filter((t) => t.vehicleId === v.id && t.status === 'Completed').reduce((s, t) => s + t.plannedDistance, 0);
      const efficiency = distance > 0 ? (fuel / distance) * 100 : 0;
      return { label: v.name, value: Math.round(efficiency * 10) / 10, cost: fuel };
    }).filter((d) => d.value > 0);
  }, [vehicles, fuelLogs, trips]);

  // Fleet utilization per vehicle
  const utilization = useMemo(() => {
    return vehicles.filter((v) => v.status !== 'Retired').map((v) => {
      const vTrips = trips.filter((t) => t.vehicleId === v.id);
      const completed = vTrips.filter((t) => t.status === 'Completed').length;
      const total = vTrips.length || 1;
      return { label: v.name, value: Math.round((completed / total) * 100), vehicle: v };
    });
  }, [vehicles, trips]);

  // Operational cost breakdown
  const operationalCost = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    return months.map((m, i) => ({
      label: m,
      value: Math.round(8000 + Math.cos(i * 0.5) * 1500 + i * 400 + Math.random() * 500),
    }));
  }, []);

  // Vehicle ROI: revenue (trips * cargo * rate) vs cost (fuel + maintenance + acquisition amortized)
  const vehicleROI = useMemo(() => {
    return vehicles.filter((v) => v.status !== 'Retired').map((v) => {
      const fuelCost = fuelLogs.filter((f) => f.vehicleId === v.id).reduce((s, f) => s + f.cost, 0);
      const maintCost = maintenance.filter((m) => m.vehicleId === v.id).reduce((s, m) => s + m.cost, 0);
      const tripRevenue = trips.filter((t) => t.vehicleId === v.id && t.status === 'Completed').reduce((s, t) => s + t.plannedDistance * 2.5, 0);
      const totalCost = fuelCost + maintCost + v.acquisitionCost / 60;
      const roi = totalCost > 0 ? ((tripRevenue - totalCost) / totalCost) * 100 : 0;
      return { label: v.name, value: Math.round(roi), revenue: tripRevenue, cost: totalCost };
    });
  }, [vehicles, fuelLogs, maintenance, trips]);

  const costBreakdown = useMemo(() => {
    const fuel = fuelLogs.reduce((s, f) => s + f.cost, 0);
    const maint = maintenance.filter((m) => m.status === 'Completed').reduce((s, m) => s + m.cost, 0);
    const insurance = expenses.filter((e) => e.type === 'Insurance').reduce((s, e) => s + e.amount, 0);
    const salaries = expenses.filter((e) => e.type === 'Salaries').reduce((s, e) => s + e.amount, 0);
    const other = expenses.filter((e) => e.type === 'Tolls' || e.type === 'Other').reduce((s, e) => s + e.amount, 0);
    return [
      { label: 'Fuel', value: Math.round(fuel), color: '#10b981' },
      { label: 'Maintenance', value: Math.round(maint), color: '#f59e0b' },
      { label: 'Insurance', value: Math.round(insurance), color: '#3b82f6' },
      { label: 'Salaries', value: Math.round(salaries), color: '#8b5cf6' },
      { label: 'Other', value: Math.round(other), color: '#94a3b8' },
    ];
  }, [fuelLogs, maintenance, expenses]);

  const exportFuelEfficiency = () => {
    downloadCSV('fuel-efficiency.csv', toCSV(['Vehicle', 'L/100km', 'Total Fuel (L)'], fuelEfficiency.map((d) => [d.label, d.value, d.cost])));
  };
  const exportUtilization = () => {
    downloadCSV('fleet-utilization.csv', toCSV(['Vehicle', 'Utilization %', 'Status'], utilization.map((d) => [d.label, d.value, d.vehicle.status])));
  };
  const exportOpCost = () => {
    downloadCSV('operational-cost.csv', toCSV(['Month', 'Cost ($)'], operationalCost.map((d) => [d.label, d.value])));
  };
  const exportROI = () => {
    downloadCSV('vehicle-roi.csv', toCSV(['Vehicle', 'ROI %', 'Revenue ($)', 'Cost ($)'], vehicleROI.map((d) => [d.label, d.value, Math.round(d.revenue), Math.round(d.cost)])));
  };
  const exportAll = () => {
    const all = [
      ['FUEL EFFICIENCY REPORT'],
      ['Vehicle', 'L/100km', 'Total Fuel (L)'],
      ...fuelEfficiency.map((d) => [d.label, d.value, d.cost]),
      [],
      ['FLEET UTILIZATION REPORT'],
      ['Vehicle', 'Utilization %', 'Status'],
      ...utilization.map((d) => [d.label, d.value, d.vehicle.status]),
      [],
      ['VEHICLE ROI REPORT'],
      ['Vehicle', 'ROI %', 'Revenue ($)', 'Cost ($)'],
      ...vehicleROI.map((d) => [d.label, d.value, Math.round(d.revenue), Math.round(d.cost)]),
    ];
    downloadCSV('transitops-full-report.csv', all.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'));
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights into fleet performance and costs."
        action={<Button variant="secondary" onClick={exportAll}><Download className="w-4 h-4" /> Export All (CSV)</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="animate-slide-up">
          <CardHeader
            title="Fuel Efficiency"
            subtitle="Liters per 100km by vehicle"
            action={<Button size="sm" variant="ghost" onClick={exportFuelEfficiency}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <div className="p-5">
            <BarChart data={fuelEfficiency} height={200} formatValue={(v) => `${v} L/100km`} />
          </div>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader
            title="Fleet Utilization"
            subtitle="Trip completion rate by vehicle"
            action={<Button size="sm" variant="ghost" onClick={exportUtilization}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <div className="p-5 space-y-3">
            {utilization.slice(0, 6).map((u, i) => (
              <ProgressBar key={u.label} label={u.label} value={u.value} max={100} color={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][i]} />
            ))}
          </div>
        </Card>

        <Card className="animate-slide-up">
          <CardHeader
            title="Operational Cost Trend"
            subtitle="Monthly operational expenditure"
            action={<Button size="sm" variant="ghost" onClick={exportOpCost}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <div className="p-5">
            <LineChart data={operationalCost} height={200} color="#10b981" formatValue={(v) => `$${(v / 1000).toFixed(1)}k`} />
          </div>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader
            title="Vehicle ROI"
            subtitle="Return on investment percentage"
            action={<Button size="sm" variant="ghost" onClick={exportROI}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <div className="p-5">
            <BarChart
              data={vehicleROI.map((d) => ({ label: d.label, value: d.value, color: d.value >= 0 ? '#10b981' : '#ef4444' }))}
              height={200}
              formatValue={(v) => `${v}%`}
            />
          </div>
        </Card>
      </div>

      <Card className="animate-slide-up">
        <CardHeader title="Cost Breakdown" subtitle="Distribution of operational expenses" />
        <div className="p-5 flex justify-center">
          <DonutChart data={costBreakdown} centerValue={formatCurrency(costBreakdown.reduce((s, d) => s + d.value, 0))} centerLabel="Total" />
        </div>
      </Card>
    </div>
  );
}
