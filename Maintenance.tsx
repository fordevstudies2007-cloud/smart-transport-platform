import { useState } from 'react';
import { Plus, Pencil, Trash2, Wrench, Play, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import type { Maintenance, MaintenanceType, MaintenanceStatus } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, statusTone } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../lib/format';

const maintenanceTypes: MaintenanceType[] = ['Preventive', 'Corrective', 'Inspection', 'Tire Replacement', 'Engine Repair'];
const maintenanceStatuses: MaintenanceStatus[] = ['Scheduled', 'In Progress', 'Completed'];

const emptyForm: Omit<Maintenance, 'id'> = {
  vehicleId: '', type: 'Preventive', date: new Date().toISOString().slice(0, 10),
  description: '', cost: 0, status: 'Scheduled',
};

export function MaintenancePage() {
  const { maintenance, vehicles, addMaintenance, updateMaintenance, deleteMaintenance, startMaintenance, completeMaintenance } = useStore();
  const { can } = useAuth();
  const canManage = can('maintenance:manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [form, setForm] = useState<Omit<Maintenance, 'id'>>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (m: Maintenance) => {
    setEditing(m);
    const { id: _, ...rest } = m;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.vehicleId) e.vehicleId = 'Required';
    if (!form.date) e.date = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    if (form.cost < 0) e.cost = 'Must be >= 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) updateMaintenance(editing.id, form);
    else addMaintenance(form);
    setModalOpen(false);
  };

  const vehicleName = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : '—';
  };

  const columns: Column<Maintenance>[] = [
    {
      key: 'vehicle', header: 'Vehicle', sortValue: (m) => vehicleName(m.vehicleId),
      render: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="font-medium">{vehicleName(m.vehicleId)}</span>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortValue: (m) => m.type, render: (m) => <span className="text-muted">{m.type}</span> },
    { key: 'date', header: 'Date', sortValue: (m) => m.date, render: (m) => formatDate(m.date) },
    { key: 'description', header: 'Description', render: (m) => <span className="text-muted text-sm line-clamp-1 max-w-xs">{m.description}</span> },
    { key: 'cost', header: 'Cost', sortValue: (m) => m.cost, render: (m) => formatCurrency(m.cost) },
    {
      key: 'status', header: 'Status', sortValue: (m) => m.status,
      render: (m) => <Badge tone={statusTone(m.status)} dot>{m.status}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          {canManage && m.status === 'Scheduled' && (
            <button onClick={(e) => { e.stopPropagation(); startMaintenance(m.id); }} title="Start" className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
              <Play className="w-4 h-4" />
            </button>
          )}
          {canManage && m.status === 'In Progress' && (
            <button onClick={(e) => { e.stopPropagation(); completeMaintenance(m.id); }} title="Complete" className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {canManage && m.status !== 'In Progress' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors">
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
        title="Maintenance"
        description="Track maintenance schedules and automatically update vehicle status."
        action={canManage && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Record</Button>}
      />

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={maintenance}
          searchKeys={['description', 'type']}
          searchPlaceholder="Search maintenance..."
          filterOptions={maintenanceStatuses.map((s) => ({ label: s, value: s }))}
          filterFn={(row, f) => row.status === f}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Maintenance' : 'Add Maintenance'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} error={errors.vehicleId}>
            <option value="">Select vehicle...</option>
            {vehicles.filter((v) => v.status !== 'Retired').map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
            ))}
          </Select>
          <Select label="Maintenance Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}>
            {maintenanceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
          <Input label="Cost ($)" type="number" value={form.cost || ''} onChange={(e) => setForm({ ...form, cost: +e.target.value })} error={errors.cost} />
          <div className="sm:col-span-2">
            <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} placeholder="Describe the maintenance work..." />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MaintenanceStatus })}>
            {maintenanceStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save Changes' : 'Add Record'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Maintenance Record"
        message="Are you sure you want to delete this maintenance record?"
        onConfirm={() => { if (deleteId) deleteMaintenance(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
