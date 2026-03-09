"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Package, ShoppingCart, Loader2 } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/toast";
import type { Customer, Item } from "@/types";
import { formatDate } from "@/lib/utils";

const RATES_LS_KEY = "pakk_exchange_rates";

function getCbm(item: Item): number {
  const { length: l, width: w, height: h, dimensionUnit: unit } = item;
  if (!l || !w || !h) return 0;
  return unit === "inches"
    ? l * w * h * 0.000016387
    : l * w * h / 1_000_000;
}

function calcTotalGhs(items: Item[]): number {
  try {
    const stored = localStorage.getItem(RATES_LS_KEY);
    if (!stored) return 0;
    const { shippingRatePerCbm = 0, usdToGhs = 0 } = JSON.parse(stored);
    const totalCbm = items.reduce((sum, item) => sum + getCbm(item), 0);
    return Math.round(totalCbm * shippingRatePerCbm * usdToGhs * 100) / 100;
  } catch {
    return 0;
  }
}

export default function NewOrderPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerItems, setCustomerItems] = useState<Item[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/customers");
        setCustomers(res.data.data);
      } catch {
        error("Failed to load customers");
      } finally {
        setLoadingCustomers(false);
      }
    };
    load();
  }, [error]);

  const loadCustomerItems = useCallback(
    async (customerId: string) => {
      if (!customerId) {
        setCustomerItems([]);
        setSelectedItemIds([]);
        return;
      }
      setLoadingItems(true);
      try {
        const res = await axios.get("/api/items", {
          params: { customerId },
        });
        const unordered = res.data.data.filter((item: Item) => !item.orderId);
        setCustomerItems(unordered);
        setSelectedItemIds([]);
      } catch {
        error("Failed to load items");
      } finally {
        setLoadingItems(false);
      }
    },
    [error]
  );

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    loadCustomerItems(customerId);
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      const selectedItems = customerItems.filter((item) => next.includes(item.id));
      const auto = calcTotalGhs(selectedItems);
      if (auto > 0) setInvoiceAmount(String(auto));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return error("Please select a customer");
    if (selectedItemIds.length === 0)
      return error("Please select at least one item");
    if (!invoiceAmount || Number(invoiceAmount) <= 0)
      return error("Invoice amount is required", "Set billing rates in Staff settings if it's not auto-calculating");

    setSubmitting(true);
    try {
      const res = await axios.post("/api/orders", {
        customerId: selectedCustomerId,
        itemIds: selectedItemIds,
        invoiceAmount: Number(invoiceAmount),
        invoiceDate,
        notes: notes || undefined,
      });
      success("Invoice created!", res.data.message);
      router.push(`/admin/orders/${res.data.data.id}`);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to create order"
        : "Failed to create order";
      error("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const customerOptions = [
    { value: "", label: "Select a customer..." },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.shippingMark})`,
    })),
  ];

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex flex-col h-full">
      <Header title="New Invoice" subtitle="Create an invoice for a customer" />

      <div className="flex-1 overflow-y-auto p-6">
        <button
          onClick={() => router.push("/admin/orders")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </button>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Invoice Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <ShoppingCart className="h-4 w-4 text-brand-600" />
              Invoice Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer <span className="text-red-500">*</span>
                </label>
                {loadingCustomers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading customers...
                  </div>
                ) : (
                  <Select
                    options={customerOptions}
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Invoice Amount (GHS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={invoiceAmount ? `GHS ${Number(invoiceAmount).toFixed(2)}` : ""}
                    placeholder="Select items to auto-calculate"
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-700 cursor-default"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Auto-computed from CBM × shipping rate × exchange rate
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Item Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-brand-600" />
              Select Items
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {selectedCustomer
                ? `Unordered items for ${selectedCustomer.name}`
                : "Select a customer above to see their available items"}
            </p>

            {!selectedCustomerId ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Select a customer first</p>
              </div>
            ) : loadingItems ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading items...
              </div>
            ) : customerItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  No unordered items for this customer
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerItems.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedItemIds.includes(item.id)
                        ? "border-brand-200 bg-brand-50"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 accent-brand-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.description || item.itemRef}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.itemRef} · {item.weight} kg ·{" "}
                        {formatDate(item.dateReceived)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {(() => {
                        try {
                          const stored = localStorage.getItem(RATES_LS_KEY);
                          const { shippingRatePerCbm = 0, usdToGhs = 0 } = stored ? JSON.parse(stored) : {};
                          const cbm = getCbm(item);
                          const ghs = Math.round(cbm * shippingRatePerCbm * usdToGhs * 100) / 100;
                          return cbm > 0 ? (
                            <span className="text-xs font-semibold text-brand-700">
                              GHS {ghs.toFixed(2)}
                            </span>
                          ) : null;
                        } catch { return null; }
                      })()}
                      <p className="text-xs text-gray-400">{item.status}</p>
                    </div>
                  </label>
                ))}
                {selectedItemIds.length > 0 && (
                  <p className="text-xs text-brand-600 font-medium pt-1">
                    {selectedItemIds.length} item(s) selected
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/orders")}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              Generate Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
