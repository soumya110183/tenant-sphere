// SupplierPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';

/**
 * SupplierPage.tsx
 *
 * Combined Supplier List + Add/Edit modal component in TypeScript (TSX).
 *
 * Expected backend endpoints:
 *  - GET  /api/v1/suppliers?q=&page=&limit=
 *  - GET  /api/v1/suppliers/:id
 *  - POST /api/v1/suppliers
 *  - PUT  /api/v1/suppliers/:id
 *  - DELETE /api/v1/suppliers/:id
 *
 * Integration:
 *  - Set axios.defaults.baseURL = process.env.REACT_APP_API_BASE or use interceptors
 *  - Add auth token via axios interceptors in your app entry
 */

type ID = string;

interface Supplier {
  id: ID;
  code?: string;
  name: string;
  type?: 'local' | 'import' | 'contractor' | 'other';
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  altPhone?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  ifsc?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  city?: string;
  pincode?: string;
  country?: string;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
  balanceType?: 'open_debit' | 'open_credit' | 'none';
  defaultPurchasePriceListId?: ID | null;
  supplierGroupId?: ID | null;
  ledgerId?: ID | null;
  status?: 'active' | 'inactive';
  notes?: string;
  outstanding?: number; // optional: backend may return precomputed outstanding
}

interface SupplierForm {
  code?: string;
  name: string;
  type: 'local' | 'import' | 'contractor' | 'other';
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  altPhone?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  ifsc?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  city?: string;
  pincode?: string;
  country?: string;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
  balanceType?: 'open_debit' | 'open_credit' | 'none';
  status?: 'active' | 'inactive';
  notes?: string;
}

type FormErrors = Partial<Record<keyof SupplierForm | 'general', string>>;

const DEFAULT_FORM: SupplierForm = {
  code: '',
  name: '',
  type: 'local',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  altPhone: '',
  gstin: '',
  pan: '',
  bankName: '',
  bankAccountNo: '',
  ifsc: '',
  billingAddress: '',
  shippingAddress: '',
  state: '',
  city: '',
  pincode: '',
  country: 'India',
  creditLimit: 0,
  creditDays: 0,
  openingBalance: 0,
  balanceType: 'none',
  status: 'active',
  notes: ''
};

export default function SupplierPage(): JSX.Element {
  // List state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [query, setQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Modal/form state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [form, setForm] = useState<SupplierForm>({ ...DEFAULT_FORM });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch list (server-side pagination & filter)
  const fetchSuppliers = useCallback(
    async (pageToLoad: number = page) => {
      setLoading(true);
      try {
        const resp = await axios.get('/api/v1/suppliers', {
          params: { q: query || undefined, page: pageToLoad, limit }
        });
        // expecting { data: Supplier[], total: number }
        const data = resp.data as { data: Supplier[]; total: number };
        setSuppliers(data.data || []);
        setTotal(data.total ?? data.data?.length ?? 0);
      } catch (err) {
        console.error('Failed to fetch suppliers', err);
      } finally {
        setLoading(false);
      }
    },
    [query, page]
  );

  useEffect(() => {
    fetchSuppliers(page);
  }, [fetchSuppliers, page]);

  // Open create modal
  function openCreate(): void {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setFormErrors({});
    setModalOpen(true);
  }

  // Open edit modal - fetch supplier detail
  async function openEdit(id: ID): Promise<void> {
    setEditingId(id);
    setFormErrors({});
    try {
      const resp = await axios.get(`/api/v1/suppliers/${id}`);
      const d = resp.data.data as Supplier;
      const mapped: SupplierForm = {
        code: d.code ?? '',
        name: d.name ?? '',
        type: d.type ?? 'local',
        primaryContactName: d.primaryContactName ?? '',
        primaryContactEmail: d.primaryContactEmail ?? '',
        primaryContactPhone: d.primaryContactPhone ?? '',
        altPhone: d.altPhone ?? '',
        gstin: d.gstin ?? '',
        pan: d.pan ?? '',
        bankName: d.bankName ?? '',
        bankAccountNo: d.bankAccountNo ?? '',
        ifsc: d.ifsc ?? '',
        billingAddress: d.billingAddress ?? '',
        shippingAddress: d.shippingAddress ?? '',
        state: d.state ?? '',
        city: d.city ?? '',
        pincode: d.pincode ?? '',
        country: d.country ?? 'India',
        creditLimit: d.creditLimit ?? 0,
        creditDays: d.creditDays ?? 0,
        openingBalance: d.openingBalance ?? 0,
        balanceType: d.balanceType ?? 'none',
        status: d.status ?? 'active',
        notes: d.notes ?? ''
      };
      setForm(mapped);
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to load supplier', error);
      alert('Failed to load supplier details. See console.');
    }
  }

  // Validate basic client-side fields
  function validateForm(): boolean {
    const errs: FormErrors = {};
    if (!form.name || form.name.trim().length === 0) errs.name = 'Name is required';
    if (form.primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryContactEmail)) {
      errs.primaryContactEmail = 'Invalid email';
    }
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$/.test(form.gstin)) {
      errs.gstin = 'Invalid GSTIN format';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Save handler (create or update)
  async function handleSave(e?: React.FormEvent): Promise<void> {
    e?.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/api/v1/suppliers/${editingId}`, form);
      } else {
        await axios.post('/api/v1/suppliers', form);
      }
      setModalOpen(false);
      setEditingId(null);
      setForm({ ...DEFAULT_FORM });
      setPage(1);
      await fetchSuppliers(1);
    } catch (err) {
      // parse server validation errors if present
      const aerr = err as AxiosError;
      if (aerr.response?.data) {
        // adapt to your server format; example: { errors: { field: "msg" } } or { error: "message" }
        const payload = aerr.response.data as any;
        if (payload.errors && typeof payload.errors === 'object') {
          setFormErrors(payload.errors as FormErrors);
        } else if (payload.error) {
          setFormErrors({ general: String(payload.error) });
        } else {
          setFormErrors({ general: 'Save failed' });
        }
      } else {
        setFormErrors({ general: 'Save failed: network error' });
      }
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  }

  // Delete (soft delete)
  async function handleDelete(id: ID): Promise<void> {
    const ok = window.confirm('Are you sure? This will soft-delete the supplier.');
    if (!ok) return;
    try {
      await axios.delete(`/api/v1/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed. See console.');
    }
  }

  // Pagination helpers
  function prevPage(): void {
    setPage((p) => Math.max(1, p - 1));
  }
  function nextPage(): void {
    setPage((p) => p + 1);
  }

  // Render outstanding: prefer backend-provided outstanding field for list performance
  function outstandingValue(s: Supplier): string {
    if (typeof s.outstanding === 'number') return s.outstanding.toFixed(2);
    return '—';
  }

  // Controlled input handlers
  function setField<K extends keyof SupplierForm>(key: K, value: SupplierForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // JSX
  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-gray-600">Manage supplier master, bank details, payment terms and outstanding.</p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="search"
            placeholder="Search suppliers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchSuppliers(1); } }}
            className="border rounded px-3 py-2 w-72"
            aria-label="Search suppliers"
          />
          <button onClick={() => { setPage(1); fetchSuppliers(1); }} className="px-3 py-2 border rounded bg-white">Search</button>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded">+ Add Supplier</button>
        </div>
      </div>

      <div className="mt-6 bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold">Suppliers ({total})</div>
          <div className="text-sm text-gray-500">{loading ? 'Loading…' : `Page ${page}`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Type</th>
                <th className="py-2">Bank</th>
                <th className="py-2">Outstanding</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {suppliers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">No suppliers found.</td>
                </tr>
              )}

              {suppliers.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium">{s.name}</div>
                    {s.code && <div className="text-xs text-gray-400">{s.code}</div>}
                  </td>
                  <td className="py-3">
                    <div>{s.primaryContactPhone ?? '—'}</div>
                    <div className="text-xs text-gray-500">{s.primaryContactEmail ?? '—'}</div>
                  </td>
                  <td className="py-3">{s.type ?? 'local'}</td>
                  <td className="py-3">{s.bankName ? `${s.bankName} • ${s.bankAccountNo ?? ''}` : '—'}</td>
                  <td className="py-3">{outstandingValue(s)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {s.status ?? 'active'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center space-x-2">
                      <button onClick={() => openEdit(s.id)} className="px-2 py-1 border rounded text-sm">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="px-2 py-1 border rounded text-sm text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Showing {suppliers.length} of {total}</div>
          <div className="space-x-2">
            <button onClick={prevPage} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <button onClick={nextPage} className="px-3 py-1 border rounded">Next</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black bg-opacity-40">
          <div className="bg-white w-full max-w-2xl rounded shadow-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => { setModalOpen(false); setEditingId(null); }} className="text-gray-600">✕</button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="p-6 space-y-4">
              {formErrors.general && <div className="text-red-600">{formErrors.general}</div>}

              <div>
                <label className="block text-sm font-medium">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                {formErrors.name && <div className="text-red-600 text-sm mt-1">{formErrors.name}</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Primary Email</label>
                  <input
                    value={form.primaryContactEmail}
                    onChange={(e) => setField('primaryContactEmail', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                  {formErrors.primaryContactEmail && <div className="text-red-600 text-sm mt-1">{formErrors.primaryContactEmail}</div>}
                </div>

                <div>
                  <label className="block text-sm">Phone</label>
                  <input
                    value={form.primaryContactPhone}
                    onChange={(e) => setField('primaryContactPhone', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Type</label>
                  <select value={form.type} onChange={(e) => setField('type', e.target.value as SupplierForm['type'])} className="w-full border rounded px-3 py-2">
                    <option value="local">Local</option>
                    <option value="import">Import</option>
                    <option value="contractor">Contractor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Status</label>
                  <select value={form.status} onChange={(e) => setField('status', e.target.value as SupplierForm['status'])} className="w-full border rounded px-3 py-2">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm">GSTIN</label>
                <input value={form.gstin} onChange={(e) => setField('gstin', e.target.value)} className="w-full border rounded px-3 py-2" />
                {formErrors.gstin && <div className="text-red-600 text-sm mt-1">{formErrors.gstin}</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Bank Name</label>
                  <input value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Account No</label>
                  <input value={form.bankAccountNo} onChange={(e) => setField('bankAccountNo', e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm">Billing Address</label>
                <textarea value={form.billingAddress} onChange={(e) => setField('billingAddress', e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm">Credit Limit</label>
                  <input type="number" step="0.01" value={form.creditLimit} onChange={(e) => setField('creditLimit', Number(e.target.value || 0))} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Credit Days</label>
                  <input type="number" value={form.creditDays} onChange={(e) => setField('creditDays', Number(e.target.value || 0))} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Opening Balance</label>
                  <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setField('openingBalance', Number(e.target.value || 0))} className="w-full border rounded px-3 py-2" />
                </div>
              </div>

              <div className="flex justify-end items-center space-x-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setEditingId(null); }} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
