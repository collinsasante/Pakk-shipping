"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Order, Item } from "@/types";
import { ShoppingCart, ChevronDown, ChevronUp, Package, CheckCircle2, Clock } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";

interface OrderWithItems extends Order {
  items?: Item[];
  _expanded?: boolean;
}

function getCbm(item: Item): number {
  const { length: l, width: w, height: h, dimensionUnit: unit } = item;
  if (!l || !w || !h) return 0;
  return unit === "inches" ? l * w * h * 0.000016387 : l * w * h / 1_000_000;
}

export default function CustomerOrdersPage() {
  const { error } = useToast();
  const { appUser } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders");
      setOrders(res.data.data);
    } catch {
      error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, _expanded: !o._expanded } : o
      )
    );

    const order = orders.find((o) => o.id === orderId);
    if (order && !order.items && !order._expanded) {
      try {
        const res = await axios.get(`/api/orders/${orderId}`);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, items: res.data.data.items, _expanded: true }
              : o
          )
        );
      } catch {
        error("Failed to load order details");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="My Invoices" subtitle="Your shipping invoices and payment status" />

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500">No invoices yet</p>
          </div>
        ) : (
          orders.map((order) => {
            const itemCount = order.itemIds?.length ?? 0;
            const pricePerItem = itemCount > 0 ? order.invoiceAmount / itemCount : order.invoiceAmount;
            const dueDate = new Date(order.invoiceDate);
            dueDate.setDate(dueDate.getDate() + 30);

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Order Header */}
                <button
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-brand-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-gray-900">
                        {order.orderRef}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.invoiceDate)} · {itemCount} item(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        {formatCurrency(order.invoiceAmount)}
                      </p>
                      <div className="flex justify-end">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                    {order._expanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Inline Invoice */}
                {order._expanded && (
                  <div className="border-t border-gray-100">
                    {/* Invoice Document */}
                    <div className="p-6 space-y-5">

                      {/* Header: branding + invoice meta */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-black text-brand-700 tracking-tight">PAKKMAXX</p>
                          <p className="text-xs text-gray-400 mt-0.5">USA → Ghana Freight Forwarding</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</p>
                          <p className="font-mono font-bold text-gray-900 mt-0.5">{order.orderRef}</p>
                        </div>
                      </div>

                      {/* Dates + Bill To */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bill To</p>
                          <p className="font-semibold text-gray-900">{appUser?.customerName ?? "—"}</p>
                          {appUser?.shippingMark && (
                            <p className="text-xs text-gray-500 font-mono">{appUser.shippingMark}</p>
                          )}
                          {appUser?.shippingAddress && (
                            <p className="text-xs text-gray-400 leading-tight">{appUser.shippingAddress}</p>
                          )}
                        </div>
                        <div className="space-y-1 text-right">
                          <div>
                            <p className="text-xs text-gray-400">Issue Date</p>
                            <p className="text-sm font-medium text-gray-700">{formatDate(order.invoiceDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Due Date</p>
                            <p className="text-sm font-medium text-gray-700">{formatDate(dueDate.toISOString())}</p>
                          </div>
                        </div>
                      </div>

                      {/* Line Items */}
                      <div className="rounded-xl overflow-hidden border border-gray-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Ref</th>
                              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items ? (
                              order.items.map((item, idx) => (
                                <tr key={item.id} className={`border-b border-gray-50 ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-gray-800 truncate max-w-[160px]">{item.description || item.itemRef}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {item.shippingType === "sea" ? `${getCbm(item).toFixed(4)} m³` : `${item.weight ?? 0} kg`}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-400 font-mono hidden sm:table-cell">{item.itemRef}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                                    {formatCurrency(Math.round(pricePerItem * 100) / 100)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                                    <div className="animate-spin h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full" />
                                    Loading items…
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals */}
                      <div className="flex justify-end">
                        <div className="w-56 space-y-1.5 text-sm">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(order.invoiceAmount)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Tax</span>
                            <span>GHS 0.00</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                            <span>Total</span>
                            <span>{formatCurrency(order.invoiceAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-1">
                            <span className="text-gray-500">Amount Paid</span>
                            <span className="font-medium text-green-600">
                              {order.status === "Paid" ? formatCurrency(order.invoiceAmount) : "GHS 0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                            <span className="text-gray-700">Balance Due</span>
                            <span className={order.status === "Paid" ? "text-green-600" : "text-rose-600"}>
                              {order.status === "Paid" ? "GHS 0.00" : formatCurrency(order.invoiceAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment status banner */}
                      {order.status === "Paid" ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <p className="text-sm text-green-800 font-medium">Payment confirmed — thank you!</p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-800 font-semibold">Payment Pending</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Please pay <strong>{formatCurrency(order.invoiceAmount)}</strong> by {formatDate(dueDate.toISOString())}. Contact Pakkmaxx via WhatsApp to arrange payment.
                            </p>
                          </div>
                        </div>
                      )}

                      {order.notes && (
                        <div className="text-xs text-gray-400 border-t border-gray-50 pt-3">
                          <span className="font-medium text-gray-500">Note: </span>{order.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
