import { useState } from 'react';
import { Plus, Pencil, Trash2, Fuel } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import type { FuelLog } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatNumber, formatDate } from '../lib/format';

const emptyForm: Omit<FuelLog, 'id'> = {
  vehicleId: '', quantity: 0, cost: 0, date: new Date().toISOString().slice(0, 10),
};

export function FuelPage() {
  const { fuelLogs, vehicles, addFuelLog, updateFuelLog, deleteFuelLog } = useStore();
  const { can } = useAuth();
  const canManage = can('fuel:manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuelLog | null>(null);
  const [form, setForm] = useState<Omit<FuelLog, 'id'>>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (f: FuelLog) => {
    setEditing(f);
    const { id: _, ...rest } = f;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.vehicleId) e.vehicleId = 'Required';
    if (form.quantity <= 0) e.quantity = 'Must be > 0';
    if (form.cost <= 0) e.cost = 'Must be > 0';
    if (!form.date) e.date = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) updateFuelLog(editing.id, form);
    else addFuelLog(form);
    setModalOpen(false);
  };

  const vehicleName = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : '—';
  };

  const totalCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalQty = fuelLogs.reduce((s, f) => s + f.quantity, 0);
  const avgPrice = totalQty ? totalCost / totalQty : 0;

  const columns: Column<FuelLog>[] = [
    {
      key: 'vehicle', header: 'Vehicle', sortValue: (f) => vehicleName(f.vehicleId),
      render: (f) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
            <Fuel className="w-4 h-4" />
          </div>
          <span className="font-medium">{vehicleName(f.vehicleId)}</span>
        </div>
      ),
    },
    { key: 'quantity', header: 'Quantity (L)', sortValue: (f) => f.quantity, render: (f) => `${formatNumber(f.quantity)} L` },
    { key: 'cost', header: 'Cost', sortValue: (f) => f.cost, render: (f) => formatCurrency(f.cost) },
    { key: 'price', header: 'Price/L', sortValue: (f) => f.cost / f.quantity, render: (f) => formatCurrency(f.cost / f.quantity) },
    { key: 'date', header: 'Date', sortValue: (f) => f.date, render: (f) => formatDate(f.date) },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (f) => canManage ? (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(f); }} className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(f.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel Logs"
        description="Track fuel consumption and costs across your fleet."
        action={canManage && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Fuel Log</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in">
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Total Fuel Cost</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalCost)}</p>
        </div>
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Total Quantity</p>
          <p className="text-2xl font-bold mt-2">{formatNumber(totalQty)} L</p>
        </div>
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Average Price/L</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(avgPrice)}</p>
        </div>
      </div>

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={fuelLogs}
          searchKeys={[]}
          searchPlaceholder="Search fuel logs..."
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Fuel Log' : 'Add Fuel Log'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} error={errors.vehicleId}>
            <option value="">Select vehicle...</option>
            {vehicles.filter((v) => v.status !== 'Retired').map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
            ))}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
          <Input label="Quantity (Liters)" type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} error={errors.quantity} />
          <Input label="Cost ($)" type="number" value={form.cost || ''} onChange={(e) => setForm({ ...form, cost: +e.target.value })} error={errors.cost} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save Changes' : 'Add Fuel Log'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Fuel Log"
        message="Are you sure you want to delete this fuel log?"
        onConfirm={() => { if (deleteId) deleteFuelLog(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
