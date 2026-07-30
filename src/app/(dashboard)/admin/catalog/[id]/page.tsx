"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Check, X } from "lucide-react";
import type { ProductCatalogEntry, Supplier } from "@/types";
import axios from "axios";

export default function ProductCatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { error, success } = useToast();
  const [entry, setEntry] = useState<ProductCatalogEntry | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    description: "",
    baseCost: "",
    supplierId: "",
    materialSpecs: "",
  });

  useEffect(() => {
    Promise.all([
      axios.get(`/api/product-catalog/${id}`),
      axios.get("/api/suppliers").catch(() => ({ data: { data: [] } })),
    ])
      .then(([entryRes, suppliersRes]) => {
        const e: ProductCatalogEntry = entryRes.data.data;
        setEntry(e);
        setSuppliers(suppliersRes.data.data ?? []);
        setForm({
          productName: e.productName,
          description: e.description ?? "",
          baseCost: e.baseCost !== undefined ? String(e.baseCost) : "",
          supplierId: e.supplierId ?? "",
          materialSpecs: e.materialSpecs ?? "",
        });
      })
      .catch(() => error("Failed to load catalog entry"))
      .finally(() => setLoading(false));
  }, [id, error]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`/api/product-catalog/${id}`, {
        productName: form.productName,
        description: form.description || undefined,
        baseCost: form.baseCost ? Number(form.baseCost) : undefined,
        supplierId: form.supplierId || undefined,
        materialSpecs: form.materialSpecs || undefined,
      });
      setEntry(res.data.data);
      setEditing(false);
      success("Catalog entry updated");
    } catch {
      error("Failed to update catalog entry");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  if (loading) return (
    <div className="flex flex-col h-full">
      <Header title="Product" subtitle="" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
      </div>
    </div>
  );

  if (!entry) return null;

  return (
    <div className="flex flex-col h-full">
      <Header title={entry.productName} subtitle={entry.catalogId} />

      <div className="flex-1 p-6 max-w-2xl">
        {entry.referenceImages.length > 0 && (
          <div className="flex gap-2 mb-4">
            {entry.referenceImages.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={entry.productName} className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Product Details</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
              {editing ? (
                <input
                  type="text"
                  value={form.productName}
                  onChange={(e) => set("productName", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-900">{entry.productName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              {editing ? (
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description || "—"}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Base Cost (USD)</label>
                {editing ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.baseCost}
                    onChange={(e) => set("baseCost", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ) : (
                  <p className="text-sm text-gray-700">
                    {entry.baseCost !== undefined ? `$${entry.baseCost.toFixed(2)}` : "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
                {editing ? (
                  <select
                    value={form.supplierId}
                    onChange={(e) => set("supplierId", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-gray-700">{entry.supplierName ?? "—"}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Material Specs</label>
              {editing ? (
                <textarea
                  value={form.materialSpecs}
                  onChange={(e) => set("materialSpecs", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.materialSpecs || "—"}</p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Added by {entry.createdBy ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/admin/catalog")}>
            Back to Catalog
          </Button>
        </div>
      </div>
    </div>
  );
}
