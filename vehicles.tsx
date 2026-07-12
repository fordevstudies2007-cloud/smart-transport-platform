import { useState } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import type { Vehicle, VehicleType, VehicleStatus } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, statusTone } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatNumber } from '../lib/format';

const vehicleTypes: VehicleType[] = ['Truck', 'Van', 'Trailer', 'Refrigerated', 'Flatbed', 'Tanker'];
const vehicleStatuses: VehicleStatus[] = ['Available', 'On Trip', 'In Shop', 'Retired'];

const emptyForm: Omit<Vehicle, 'id'> = {
  registrationNumber: '', name: '', model: '', type: 'Truck',
  maxLoadCapacity: 0, odometer: 0, acquisitionCost: 0, status: 'Available',
};

export function VehiclesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useStore();
  const { can } = useAuth();
  const canManage = can('vehicles:manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    const { id: _, ...rest } = v;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.registrationNumber.trim()) e.registrationNumber = 'Required';
    else if (vehicles.some((v) => v.registrationNumber === form.registrationNumber && v.id !== editing?.id))
      e.registrationNumber = 'Must be unique';
    if (!form.name.trim()) e.name = 'Required';
    if (!form.model.trim()) e.model = 'Required';
    if (form.maxLoadCapacity <= 0) e.maxLoadCapacity = 'Must be > 0';
    if (form.odometer < 0) e.odometer = 'Must be >= 0';
    if (form.acquisitionCost < 0) e.acquisitionCost = 'Must be >= 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) updateVehicle(editing.id, form);
    else addVehicle(form);
    setModalOpen(false);
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'name', header: 'Vehicle', sortValue: (v) => v.name,
      render: (v) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium">{v.name}</div>
            <div className="text-xs text-muted">{v.registrationNumber}</div>
          </div>
        </div>
      ),
    },
    { key: 'model', header: 'Model', sortValue: (v) => v.model, render: (v) => <span className="text-muted">{v.model}</span> },
    { key: 'type', header: 'Type', sortValue: (v) => v.type, render: (v) => <span className="text-muted">{v.type}</span> },
    { key: 'capacity', header: 'Max Load', sortValue: (v) => v.maxLoadCapacity, render: (v) => `${formatNumber(v.maxLoadCapacity)} kg` },
    { key: 'odometer', header: 'Odometer', sortValue: (v) => v.odometer, render: (v) => `${formatNumber(v.odometer)} km` },
    { key: 'cost', header: 'Acquisition', sortValue: (v) => v.acquisitionCost, render: (v) => formatCurrency(v.acquisitionCost) },
    {
      key: 'status', header: 'Status', sortValue: (v) => v.status,
      render: (v) => <Badge tone={statusTone(v.status)} dot>{v.status}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (v) => canManage ? (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(v); }} className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(v.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : null,
    },
  ];

  const filterOptions = vehicleStatuses.map((s) => ({ label: s, value: s }));

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Manage your fleet inventory and vehicle details."
        action={canManage && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Vehicle</Button>}
      />

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={vehicles}
          searchKeys={['name', 'registrationNumber', 'model', 'type']}
          searchPlaceholder="Search vehicles..."
          filterOptions={filterOptions}
          filterFn={(row, f) => row.status === f}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Registration Number" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} error={errors.registrationNumber} placeholder="TRK-1001" />
          <Input label="Vehicle Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Hauler One" />
          <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} error={errors.model} placeholder="Volvo FH16 2022" />
          <Select label="Vehicle Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}>
            {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Max Load Capacity (kg)" type="number" value={form.maxLoadCapacity || ''} onChange={(e) => setForm({ ...form, maxLoadCapacity: +e.target.value })} error={errors.maxLoadCapacity} />
          <Input label="Odometer (km)" type="number" value={form.odometer || ''} onChange={(e) => setForm({ ...form, odometer: +e.target.value })} error={errors.odometer} />
          <Input label="Acquisition Cost ($)" type="number" value={form.acquisitionCost || ''} onChange={(e) => setForm({ ...form, acquisitionCost: +e.target.value })} error={errors.acquisitionCost} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}>
            {vehicleStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save Changes' : 'Add Vehicle'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This action cannot be undone."
        onConfirm={() => { if (deleteId) deleteVehicle(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
