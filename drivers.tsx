import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldAlert, Phone } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import type { Driver, DriverStatus } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, statusTone } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatDate, isLicenseExpired, daysUntil } from '../lib/format';

const driverStatuses: DriverStatus[] = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
const licenseCategories = ['Class A CDL', 'Class B CDL', 'Class C CDL'];

const emptyForm: Omit<Driver, 'id'> = {
  name: '', licenseNumber: '', licenseCategory: 'Class A CDL', licenseExpiry: '',
  contactNumber: '', safetyScore: 80, status: 'Available',
};

export function DriversPage() {
  const { drivers, addDriver, updateDriver, deleteDriver } = useStore();
  const { can } = useAuth();
  const canManage = can('drivers:manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Omit<Driver, 'id'>>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    const { id: _, ...rest } = d;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.licenseNumber.trim()) e.licenseNumber = 'Required';
    else if (drivers.some((d) => d.licenseNumber === form.licenseNumber && d.id !== editing?.id))
      e.licenseNumber = 'Must be unique';
    if (!form.licenseExpiry) e.licenseExpiry = 'Required';
    if (!form.contactNumber.trim()) e.contactNumber = 'Required';
    if (form.safetyScore < 0 || form.safetyScore > 100) e.safetyScore = '0-100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) updateDriver(editing.id, form);
    else addDriver(form);
    setModalOpen(false);
  };

  const scoreTone = (score: number) => score >= 85 ? 'text-brand-600 dark:text-brand-400' : score >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  const columns: Column<Driver>[] = [
    {
      key: 'name', header: 'Driver', sortValue: (d) => d.name,
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-500 to-brand-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-semibold">
            {d.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="font-medium">{d.name}</div>
            <div className="text-xs text-muted">{d.licenseNumber}</div>
          </div>
        </div>
      ),
    },
    { key: 'licenseCategory', header: 'License', sortValue: (d) => d.licenseCategory, render: (d) => <span className="text-muted">{d.licenseCategory}</span> },
    {
      key: 'licenseExpiry', header: 'License Expiry', sortValue: (d) => d.licenseExpiry,
      render: (d) => {
        const expired = isLicenseExpired(d.licenseExpiry);
        const days = daysUntil(d.licenseExpiry);
        return (
          <div className="flex items-center gap-1.5">
            <span className={expired ? 'text-red-600 dark:text-red-400 font-medium' : days < 30 ? 'text-amber-600 dark:text-amber-400' : ''}>
              {formatDate(d.licenseExpiry)}
            </span>
            {expired && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
          </div>
        );
      },
    },
    {
      key: 'contactNumber', header: 'Contact', render: (d) => (
        <div className="flex items-center gap-1.5 text-muted">
          <Phone className="w-3.5 h-3.5" /> {d.contactNumber}
        </div>
      ),
    },
    {
      key: 'safetyScore', header: 'Safety Score', sortValue: (d) => d.safetyScore,
      render: (d) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[rgb(var(--bg-muted))] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${d.safetyScore}%`, backgroundColor: d.safetyScore >= 85 ? '#10b981' : d.safetyScore >= 70 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <span className={`text-sm font-medium ${scoreTone(d.safetyScore)}`}>{d.safetyScore}</span>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', sortValue: (d) => d.status,
      render: (d) => <Badge tone={statusTone(d.status)} dot>{d.status}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (d) => canManage ? (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Manage driver records, licenses, and safety scores."
        action={canManage && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Driver</Button>}
      />

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={drivers}
          searchKeys={['name', 'licenseNumber', 'licenseCategory', 'contactNumber']}
          searchPlaceholder="Search drivers..."
          filterOptions={driverStatuses.map((s) => ({ label: s, value: s }))}
          filterFn={(row, f) => row.status === f}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Driver' : 'Add Driver'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="James Carter" />
          <Input label="License Number" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} error={errors.licenseNumber} placeholder="DL-4472901" />
          <Select label="License Category" value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })}>
            {licenseCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="License Expiry Date" type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} error={errors.licenseExpiry} />
          <Input label="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} error={errors.contactNumber} placeholder="+1 555 010 2231" />
          <Input label="Safety Score (0-100)" type="number" value={form.safetyScore || ''} onChange={(e) => setForm({ ...form, safetyScore: +e.target.value })} error={errors.safetyScore} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DriverStatus })}>
            {driverStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save Changes' : 'Add Driver'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Driver"
        message="Are you sure you want to delete this driver? This action cannot be undone."
        onConfirm={() => { if (deleteId) deleteDriver(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
