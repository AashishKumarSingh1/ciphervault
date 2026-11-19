"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  Key,
  CheckCircle,
  AlertCircle,
  Copy,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { api, EncryptedRecord, DecryptedRecord } from "@/lib/api";

const CATEGORIES = ["All", "Identity", "Financial", "Medical", "Credentials"];

export default function RecordsPage() {
  const [records, setRecords] = useState<EncryptedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Selected Record States
  const [activeDecrypted, setActiveDecrypted] = useState<DecryptedRecord | null>(null);
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    phone_number: "",
    category: "Identity",
    sensitive_notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.listRecords(
        selectedCategory === "All" ? undefined : selectedCategory,
        searchQuery || undefined
      );
      setRecords(data);
    } catch (err: any) {
      console.error("Failed to fetch records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleOpenCreate = () => {
    setFormData({
      id: "",
      full_name: "",
      email: "",
      phone_number: "",
      category: "Identity",
      sensitive_notes: "",
    });
    setActionError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setActionError(null);
    try {
      await api.createRecord({
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        category: formData.category,
        sensitive_notes: formData.sensitive_notes,
      });
      setIsCreateOpen(false);
      fetchRecords();
    } catch (err: any) {
      setActionError(err.message || "Failed to create encrypted record.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleViewDecrypted = async (recordId: string) => {
    setDecryptLoading(true);
    setActionError(null);
    try {
      const data = await api.getDecryptedRecord(recordId);
      setActiveDecrypted(data);
      setIsDetailOpen(true);
    } catch (err: any) {
      alert(`Decryption failed: ${err.message}`);
    } finally {
      setDecryptLoading(false);
    }
  };

  const handleOpenEdit = async (recordId: string) => {
    try {
      const data = await api.getDecryptedRecord(recordId);
      setFormData({
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        category: data.category,
        sensitive_notes: data.sensitive_notes,
      });
      setActionError(null);
      setIsEditOpen(true);
    } catch (err: any) {
      alert(`Could not load record for edit: ${err.message}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setActionError(null);
    try {
      await api.updateRecord(formData.id, {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        category: formData.category,
        sensitive_notes: formData.sensitive_notes,
      });
      setIsEditOpen(false);
      fetchRecords();
    } catch (err: any) {
      setActionError(err.message || "Failed to update record.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure you want to securely delete this encrypted record?")) return;
    try {
      await api.deleteRecord(recordId);
      fetchRecords();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <MainLayout
      title="Secure Records Management"
      subtitle="Authenticated Pre-Insert AES-256-GCM Storage Vault"
      actions={
        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Encrypted Record</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#151E30] border border-[#293449] overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-[#F59E0B] text-slate-950 font-bold shadow-sm"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1B263B]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search encrypted records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#151E30] border border-[#293449] rounded-lg text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </div>

        {/* Encrypted Records Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#293449] bg-[#1B263B]/60 text-[#94A3B8]">
                  <th className="p-4 font-medium">Record UUID</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Ciphertext (AES-GCM)</th>
                  <th className="p-4 font-medium">Nonce (12B)</th>
                  <th className="p-4 font-medium">Auth Tag (16B)</th>
                  <th className="p-4 font-medium">Persisted At</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#293449]/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#94A3B8]">
                      Loading encrypted records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#94A3B8]">
                      No records found in this category. Click &quot;New Encrypted Record&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-[#1B263B]/40 transition-colors group"
                    >
                      <td className="p-4 font-mono text-[#F1F5F9] whitespace-nowrap">
                        <span className="text-[#38BDF8]">{r.id.slice(0, 8)}</span>...
                        {r.id.slice(-4)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <Badge
                          variant={
                            r.category === "Financial"
                              ? "amber"
                              : r.category === "Medical"
                              ? "green"
                              : r.category === "Credentials"
                              ? "red"
                              : "blue"
                          }
                        >
                          {r.category}
                        </Badge>
                      </td>
                      <td className="p-4 text-[#38BDF8] whitespace-nowrap font-mono max-w-[200px] truncate">
                        {r.ciphertext_preview}
                      </td>
                      <td className="p-4 text-[#94A3B8] whitespace-nowrap font-mono">
                        {r.nonce.slice(0, 6)}...{r.nonce.slice(-6)}
                      </td>
                      <td className="p-4 text-[#94A3B8] whitespace-nowrap font-mono">
                        {r.auth_tag.slice(0, 6)}...{r.auth_tag.slice(-6)}
                      </td>
                      <td className="p-4 text-[#94A3B8] whitespace-nowrap">
                        {r.created_at.slice(0, 16)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap space-x-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewDecrypted(r.id)}
                          title="Decrypt with master key"
                        >
                          <Unlock className="w-3.5 h-3.5 text-[#22C55E]" />
                          <span className="ml-1">Decrypt</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(r.id)}
                          title="Edit & Re-encrypt"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r.id)}
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* CREATE RECORD MODAL */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Encrypted Record"
          subtitle="Sensitive plaintext is encrypted with AES-256-GCM before database insertion"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <Input
              label="Full Name"
              placeholder="e.g. Eleanor Vance"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                placeholder="e.g. e.vance@defense.gov"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <Input
                label="Phone Number"
                placeholder="+1 (555) 019-2831"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#F1F5F9]">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border border-[#293449] text-sm text-[#F1F5F9] focus:outline-none focus:border-amber-500"
              >
                <option value="Identity">Identity</option>
                <option value="Financial">Financial</option>
                <option value="Medical">Medical</option>
                <option value="Credentials">Credentials</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#F1F5F9]">
                Sensitive Notes (Encrypted at Rest)
              </label>
              <textarea
                rows={4}
                placeholder="Enter confidential notes, secret keys, or medical observations..."
                value={formData.sensitive_notes}
                onChange={(e) => setFormData({ ...formData, sensitive_notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border border-[#293449] text-sm text-[#F1F5F9] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#293449] flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={formSubmitting}>
                <Lock className="w-4 h-4 mr-1.5" />
                Encrypt & Persist Record
              </Button>
            </div>
          </form>
        </Modal>

        {/* EDIT RECORD MODAL */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Update & Re-encrypt Record"
          subtitle="Modifications will generate a fresh 12-byte nonce and updated authentication tag"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <Input
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <Input
                label="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#F1F5F9]">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border border-[#293449] text-sm text-[#F1F5F9] focus:outline-none focus:border-amber-500"
              >
                <option value="Identity">Identity</option>
                <option value="Financial">Financial</option>
                <option value="Medical">Medical</option>
                <option value="Credentials">Credentials</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#F1F5F9]">
                Sensitive Notes (Will be Re-encrypted)
              </label>
              <textarea
                rows={4}
                value={formData.sensitive_notes}
                onChange={(e) => setFormData({ ...formData, sensitive_notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border border-[#293449] text-sm text-[#F1F5F9] focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#293449] flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={formSubmitting}>
                <Lock className="w-4 h-4 mr-1.5" />
                Update & Re-encrypt
              </Button>
            </div>
          </form>
        </Modal>

        {/* VIEW DECRYPTED RECORD MODAL */}
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Authenticated Record Decryption"
          subtitle="Identity verified. AES-256-GCM authentication tag validated."
          maxWidth="max-w-2xl"
        >
          {activeDecrypted && (
            <div className="space-y-5">
              {/* Cryptographic verification banner */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                  <span>MAC Tag Verified: Integrity Confirmed</span>
                </div>
                <Badge variant="green">{activeDecrypted.encryption_version}</Badge>
              </div>

              {/* Record Content */}
              <div className="grid grid-cols-2 gap-4 bg-[#0B1120] p-4 rounded-xl border border-[#293449] text-xs font-mono">
                <div>
                  <span className="text-[#94A3B8]">Full Name:</span>
                  <div className="text-sm text-[#F1F5F9] font-medium mt-0.5">
                    {activeDecrypted.full_name}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Category:</span>
                  <div className="mt-0.5">
                    <Badge variant="amber">{activeDecrypted.category}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Email Address:</span>
                  <div className="text-sm text-[#F1F5F9] mt-0.5">
                    {activeDecrypted.email}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Phone Number:</span>
                  <div className="text-sm text-[#F1F5F9] mt-0.5">
                    {activeDecrypted.phone_number}
                  </div>
                </div>
              </div>

              {/* Sensitive Notes */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-[#F59E0B] font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  DECRYPTED SENSITIVE NOTES
                </span>
                <div className="p-4 rounded-xl bg-[#0B1120] border border-[#293449] text-xs font-mono text-[#F1F5F9] whitespace-pre-wrap leading-relaxed shadow-inner">
                  {activeDecrypted.sensitive_notes}
                </div>
              </div>

              {/* Technical Cryptographic Parameters */}
              <div className="p-3 rounded-xl bg-[#1B263B]/60 border border-[#293449] text-[11px] font-mono space-y-1.5">
                <div className="text-[#38BDF8] font-medium">Underlying Cryptographic Parameters:</div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Nonce (Hex):</span>
                  <span className="text-[#F1F5F9]">{activeDecrypted.nonce}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Auth Tag (Hex):</span>
                  <span className="text-[#F1F5F9]">{activeDecrypted.auth_tag}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                  Close Viewer
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
