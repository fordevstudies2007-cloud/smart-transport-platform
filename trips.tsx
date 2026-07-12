import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Route, Play, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import type { Trip, TripStatus } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, statusTone } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatNumber, formatDate, isLicenseExpired } from '../lib/format';

const tripStatuses: TripStatus[] = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

interface TripForm {
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
}

export function TripsPage() {
  const { trips, vehicles, drivers, createTrip, updateTrip, dispatchTrip, completeTrip, cancelTrip, deleteTrip } = useStore();
  const { can } = useAuth();
  const canManage = can('trips:manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [form, setForm] = useState<TripForm>({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: 0, plannedDistance: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === 'Available'), [vehicles]);
  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.status === 'Available' && !isLicenseExpired(d.licenseExpiry)),
    [drivers]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: 0, plannedDistance: 0 });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (t: Trip) => {
    setEditing(t);
    setForm({ source: t.source, destination: t.destination, vehicleId: t.vehicleId, driverId: t.driverId, cargoWeight: t.cargoWeight, plannedDistance: t.plannedDistance });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.source.trim()) e.source = 'Required';
    if (!form.destination.trim()) e.destination = 'Required';
    if (!form.vehicleId) e.vehicleId = 'Required';
    if (!form.driverId) e.driverId = 'Required';
    if (form.cargoWeight <= 0) e.cargoWeight = 'Must be > 0';
    if (form.plannedDistance <= 0) e.plannedDistance = 'Must be > 0';
    if (form.vehicleId) {
      const vehicle = vehicles.find((v) => v.id === form.vehicleId);
      if (vehicle && form.cargoWeight > vehicle.maxLoadCapacity) {
        e.cargoWeight = `Exceeds capacity (${formatNumber(vehicle.maxLoadCapacity)} kg)`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) {
      updateTrip(editing.id, form);
      setModalOpen(false);
    } else {
      const result = createTrip(form);
      if (!result.ok) {
        setErrors({ form: result.error || 'Failed' });
        return;
      }
      setModalOpen(false);
    }
  };

  const handleDispatch = (id: string) => {
    setActionError(null);
    const result = dispatchTrip(id);
    if (!result.ok) setActionError(result.error || 'Failed');
  };

  const handleComplete = (id: string) => {
    setActionError(null);
    completeTrip(id);
  };

  const handleCancel = (id: string) => {
    setActionError(null);
    cancelTrip(id);
  };

  const vehicleName = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : '—';
  };
  const driverName = (id: string) => drivers.find((x) => x.id === id)?.name || '—';

  const columns: Column<Trip>[] = [
    {
      key: 'route', header: 'Route', sortValue: (t) => t.source,
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ocean-50 dark:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 flex items-center justify-center flex-shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium">{t.source} → {t.destination}</div>
            <div className="text-xs text-muted">{formatNumber(t.plannedDistance)} km</div>
          </div>
        </div>
      ),
    },
    { key: 'vehicle', header: 'Vehicle', sortValue: (t) => vehicleName(t.vehicleId), render: (t) => <span className="text-muted">{vehicleName(t.vehicleId)}</span> },
    { key: 'driver', header: 'Driver', sortValue: (t) => driverName(t.driverId), render: (t) => <span className="text-muted">{driverName(t.driverId)}</span> },
    { key: 'cargo', header: 'Cargo', sortValue: (t) => t.cargoWeight, render: (t) => `${formatNumber(t.cargoWeight)} kg` },
    { key: 'created', header: 'Created', sortValue: (t) => t.createdAt, render: (t) => formatDate(t.createdAt) },
    {
      key: 'status', header: 'Status', sortValue: (t) => t.status,
      render: (t) => <Badge tone={statusTone(t.status)} dot>{t.status}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          {canManage && t.status === 'Draft' && (
            <button onClick={(e) => { e.stopPropagation(); handleDispatch(t.id); }} title="Dispatch" className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors">
              <Play className="w-4 h-4" />
            </button>
          )}
          {canManage && t.status === 'Dispatched' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleComplete(t.id); }} title="Complete" className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleCancel(t.id); }} title="Cancel" className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {canManage && (t.status === 'Draft' || t.status === 'Cancelled') && (
            <>
              <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trips"
        description="Plan, dispatch, and track trips with automated status management."
        action={canManage && <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Trip</Button>}
      />

      {actionError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-4 py-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
        {tripStatuses.map((s) => (
          <div key={s} className="surface rounded-lg p-3 flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${s === 'Draft' ? 'bg-slate-400' : s === 'Dispatched' ? 'bg-ocean-500' : s === 'Completed' ? 'bg-brand-500' : 'bg-red-500'}`} />
            <div>
              <div className="text-xs text-muted">{s}</div>
              <div className="text-lg font-bold">{trips.filter((t) => t.status === s).length}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={trips}
          searchKeys={['source', 'destination']}
          searchPlaceholder="Search trips..."
          filterOptions={tripStatuses.map((s) => ({ label: s, value: s }))}
          filterFn={(row, f) => row.status === f}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Trip' : 'New Trip'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} error={errors.source} placeholder="Los Angeles, CA" />
          <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} error={errors.destination} placeholder="Phoenix, AZ" />
          <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} error={errors.vehicleId}>
            <option value="">Select vehicle...</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) — {formatNumber(v.maxLoadCapacity)} kg</option>
            ))}
          </Select>
          <Select label="Driver" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} error={errors.driverId}>
            <option value="">Select driver...</option>
            {availableDrivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name} — {d.licenseNumber}</option>
            ))}
          </Select>
          <Input label="Cargo Weight (kg)" type="number" value={form.cargoWeight || ''} onChange={(e) => setForm({ ...form, cargoWeight: +e.target.value })} error={errors.cargoWeight} />
          <Input label="Planned Distance (km)" type="number" value={form.plannedDistance || ''} onChange={(e) => setForm({ ...form, plannedDistance: +e.target.value })} error={errors.plannedDistance} />
        </div>
        {(availableVehicles.length === 0 || availableDrivers.length === 0) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4" />
            {availableVehicles.length === 0 && 'No available vehicles. '}
            {availableDrivers.length === 0 && 'No available drivers with valid licenses.'}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save Changes' : 'Create Trip'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Trip"
        message="Are you sure you want to delete this trip?"
        onConfirm={() => { if (deleteId) deleteTrip(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
