"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ProductCatalogEntry } from "@/types";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import axios from "axios";

export default function ProductCatalogPage() {
  const router = useRouter();
  const { error, success } = useToast();
  const [entries, setEntries] = useState<ProductCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(
    async (search?: string) => {
      setLoading(true);
      try {
        const res = await axios.get("/api/product-catalog", {
          params: { search: search || undefined },
        });
        setEntries(res.data.data);
      } catch {
        error("Failed to load product catalog");
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/product-catalog/${id}`);
      success("Catalog entry deleted");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      error("Failed to delete catalog entry");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Product Catalog" subtitle="Master directory of sourced products" />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <SearchBar
            placeholder="Search catalog..."
            onSearch={(val) => load(val)}
            className="w-full sm:w-64"
          />
          <Button onClick={() => router.push("/admin/catalog/new")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <DataTable
          columns={[
            {
              key: "catalogId",
              header: "ID",
              render: (e) => (
                <code className="text-xs font-mono font-bold text-gray-600">{e.catalogId}</code>
              ),
            },
            {
              key: "productName",
              header: "Product",
              render: (e) => (
                <div className="flex items-center gap-2">
                  {e.referenceImages[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.referenceImages[0]}
                      alt={e.productName}
                      className="h-8 w-8 rounded object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-gray-900">{e.productName}</p>
                </div>
              ),
            },
            {
              key: "supplierName",
              header: "Supplier",
              render: (e) => e.supplierName ?? <span className="text-gray-400 text-xs">—</span>,
            },
            {
              key: "baseCost",
              header: "Base Cost",
              render: (e) =>
                e.baseCost !== undefined ? (
                  <span className="text-sm text-gray-700">${e.baseCost.toFixed(2)}</span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                ),
            },
            {
              key: "actions",
              header: "",
              render: (e) => (
                <div
                  className="flex items-center gap-1 justify-end"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  {confirmDeleteId === e.id ? (
                    <>
                      <span className="text-xs text-red-600 mr-1">Delete?</span>
                      <button
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === e.id ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => router.push(`/admin/catalog/${e.id}`)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(e.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={entries}
          keyExtractor={(e) => e.id}
          loading={loading}
          emptyMessage="No products in catalog yet"
          emptyIcon={<Package className="h-12 w-12" />}
          onRowClick={(e) => router.push(`/admin/catalog/${e.id}`)}
        />
      </div>
    </div>
  );
}
