import { useState } from 'react';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import type { Expense, ExpenseType } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../lib/format';

const expenseTypes: ExpenseType[] = ['Fuel', 'Maintenance', 'Insurance', 'Tolls', 'Salaries', 'Other'];

const emptyForm: Omit<Expense, 'id'> = {
  type: 'Other', vehicleId: '', amount: 0, date: new Date().toISOString().slice(0, 10), description: '',
};

const typeTone = (t: ExpenseType) => t === 'Fuel' ? 'green' : t === 'Maintenance' ? 'amber' : t === 'Insurance' ? 'blue' : t === 'Salaries' ? 'purple' : t === 'Tolls' ? 'gray' : 'gray';

export function ExpensesPage() {
  const { expenses, vehicles, fuelLogs, maintenance, addExpense, updateExpense, deleteExpense } = useStore();
  const { can } = useAuth();
  const canManage = can('expenses:manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<Omit<Expense, 'id'>>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    const { id: _, ...rest } = e;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.type) e.type = 'Required';
    if (form.amount <= 0) e.amount = 'Must be > 0';
    if (!form.date) e.date = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editing) updateExpense(editing.id, form);
    else addExpense(form);
    setModalOpen(false);
  };

  const vehicleName = (id?: string) => {
    if (!id) return '—';
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : '—';
  };

  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalMaintenanceCost = maintenance.filter((m) => m.status === 'Completed').reduce((s, m) => s + m.cost, 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
  const totalOtherExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const columns: Column<Expense>[] = [
    {
      key: 'type', header: 'Type', sortValue: (e) => e.type,
      render: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <Badge tone={typeTone(e.type)}>{e.type}</Badge>
        </div>
      ),
    },
    { key: 'vehicle', header: 'Vehicle', sortValue: (e) => vehicleName(e.vehicleId), render: (e) => <span className="text-muted">{vehicleName(e.vehicleId)}</span> },
    { key: 'amount', header: 'Amount', sortValue: (e) => e.amount, render: (e) => <span className="font-medium">{formatCurrency(e.amount)}</span> },
    { key: 'date', header: 'Date', sortValue: (e) => e.date, render: (e) => formatDate(e.date) },
    { key: 'description', header: 'Description', render: (e) => <span className="text-muted text-sm line-clamp-1 max-w-xs">{e.description}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (e) => canManage ? (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} className="p-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track operational expenses with automatic cost calculations."
        action={canManage && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Expense</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in">
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Fuel Cost</p>
          <p className="text-2xl font-bold mt-2 text-brand-600 dark:text-brand-400">{formatCurrency(totalFuelCost)}</p>
        </div>
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Maintenance Cost</p>
          <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">{formatCurrency(totalMaintenanceCost)}</p>
        </div>
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Total Op. Cost</p>
          <p className="text-2xl font-bold mt-2 text-ocean-600 dark:text-ocean-400">{formatCurrency(totalOperationalCost)}</p>
        </div>
        <div className="surface rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide">Other Expenses</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalOtherExpenses)}</p>
        </div>
      </div>

      <div className="animate-fade-in">
        <DataTable
          columns={columns}
          data={expenses}
          searchKeys={['description', 'type']}
          searchPlaceholder="Search expenses..."
          filterOptions={expenseTypes.map((t) => ({ label: t, value: t }))}
          filterFn={(row, f) => row.type === f}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Expense Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExpenseType })} error={errors.type}>
            {expenseTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Vehicle (optional)" value={form.vehicleId || ''} onChange={(e) => setForm({ ...form, vehicleId: e.target.value || undefined })}>
            <option value="">No specific vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
            ))}
          </Select>
          <Input label="Amount ($)" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} error={errors.amount} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
          <div className="sm:col-span-2">
            <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} placeholder="Describe the expense..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save Changes' : 'Add Expense'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense?"
        onConfirm={() => { if (deleteId) deleteExpense(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}