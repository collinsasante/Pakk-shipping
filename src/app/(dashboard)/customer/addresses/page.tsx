"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import type { Warehouse } from "@/types";
import { Warehouse as WarehouseIcon, Check, Copy, CheckCheck } from "lucide-react";
import axios from "axios";

export default function CustomerAddressesPage() {
  const { appUser } = useAuth();
  const { error } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWarehouseId, setCopiedWarehouseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get("/api/warehouses");
      const list: Warehouse[] = res.data.data;
      setWarehouses(list.filter((w) => w.isActive));
      // Restore saved selection
      const saved = localStorage.getItem("pakk_preferred_warehouse");
      const match = list.find((w) => w.id === saved);
      setSelectedWarehouseId(match ? match.id : (list[0]?.id ?? null));
    } catch {
      error("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  const selectWarehouse = (id: string) => {
    setSelectedWarehouseId(id);
    localStorage.setItem("pakk_preferred_warehouse", id);
  };

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) ?? null;
  const fullMark = selectedWarehouse && appUser?.shippingMark
    ? `${selectedWarehouse.name}, ${appUser.shippingMark}`
    : appUser?.shippingMark ?? "";

  const copyMark = () => {
    if (!fullMark) return;
    navigator.clipboard.writeText(fullMark).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const copyWarehouseAddress = (w: Warehouse) => {
    const mark = appUser?.shippingMark ? ` (${appUser.shippingMark})` : "";
    const text = `${w.address}${mark}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWarehouseId(w.id);
      setTimeout(() => setCopiedWarehouseId(null), 2000);
    }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Our Addresses" subtitle="Warehouse locations you can ship to" />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-2xl">
        {/* Shipping Mark section */}
        {appUser?.shippingMark && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 space-y-2">
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Your Shipping Mark</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono font-bold text-brand-900 text-sm break-all">
                {fullMark || appUser.shippingMark}
              </code>
              {fullMark && (
                <button
                  onClick={copyMark}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-brand-100 text-brand-600 transition-colors"
                  title="Copy"
                >
                  {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
            <p className="text-xs text-brand-600">
              Write this on every package you send to our warehouse. Select your preferred warehouse below.
            </p>
          </div>
        )}

        {/* Warehouse list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Select your preferred warehouse</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-100 rounded-xl">
              <WarehouseIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No warehouses available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warehouses.map((w) => {
                const isSelected = selectedWarehouseId === w.id;
                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button onClick={() => selectWarehouse(w.id)} className="mt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "border-brand-600 bg-brand-600" : "border-gray-300"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                      <button onClick={() => selectWarehouse(w.id)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{w.address}</p>
                        {w.phone && <p className="text-xs text-gray-500 mt-0.5">{w.phone}</p>}
                      </button>
                      <div className="shrink-0 flex items-center gap-2">
                        {isSelected && (
                          <span className="text-xs font-medium text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); copyWarehouseAddress(w); }}
                          className="shrink-0 p-1 rounded hover:bg-brand-100 transition-colors"
                          title="Copy address + shipping mark"
                        >
                          {copiedWarehouseId === w.id
                            ? <CheckCheck className="h-4 w-4 text-green-500" />
                            : <Copy className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
