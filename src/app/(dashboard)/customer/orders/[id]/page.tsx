"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { Order, Item } from "@/types";
import axios from "axios";
import { ArrowLeft, CheckCircle2, Clock, Package } from "lucide-react";

interface OrderWithItems extends Order {
  items?: Item[];
}

function getCbm(item: Item): number {
  const { length: l, width: w, height: h, dimensionUnit: unit } = item;
  if (!l || !w || !h) return 0;
  return unit === "inches" ? l * w * h * 0.000016387 : l * w * h / 1_000_000;
}

export default function CustomerInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/orders/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <p className="text-gray-500">Invoice not found.</p>
        <button onClick={() => router.back()} className="text-sm text-brand-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const itemCount = order.items?.length ?? order.itemIds?.length ?? 0;
  const pricePerItem = itemCount > 0 ? order.invoiceAmount / itemCount : order.invoiceAmount;
  const dueDate = new Date(order.invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const isPaid = order.status === "Paid";

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700 font-mono">{order.orderRef}</span>
        <div className="ml-auto">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <CheckCircle2 className="h-3 w-3" /> PAID
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <Clock className="h-3 w-3" /> UNPAID
            </span>
          )}
        </div>
      </div>

      {/* Invoice document */}
      <div className="flex-1 flex justify-center py-8 px-4">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Invoice header band */}
          <div className="bg-brand-700 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-black tracking-tight">PAKKMAXX</p>
                <p className="text-brand-200 text-xs mt-0.5">USA → Ghana Freight Forwarding</p>
              </div>
              <div className="text-right">
                <p className="text-brand-300 text-xs font-semibold uppercase tracking-widest">Invoice</p>
                <p className="text-white font-mono font-bold text-lg mt-0.5">{order.orderRef}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Dates + Bill To */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                <p className="font-semibold text-gray-900 text-sm">{appUser?.customerName ?? order.customerName ?? "—"}</p>
                {appUser?.shippingMark && (
                  <p className="text-xs font-mono text-brand-600 mt-0.5">{appUser.shippingMark}</p>
                )}
                {appUser?.shippingAddress && (
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{appUser.shippingAddress}</p>
                )}
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-xs text-gray-400">Issue Date</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(order.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Due Date</p>
                  <p className={`text-sm font-medium ${!isPaid ? "text-rose-600" : "text-gray-800"}`}>
                    {formatDate(dueDate.toISOString())}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-100" />

            {/* Line items */}
            <div>
              <div className="grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">
                <span className="col-span-6">Description</span>
                <span className="col-span-3 text-center hidden sm:block">Details</span>
                <span className="col-span-3 sm:col-span-3 text-right">Amount</span>
              </div>

              {order.items ? (
                <div className="divide-y divide-gray-50">
                  {order.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 py-3 items-center">
                      <div className="col-span-7 sm:col-span-6 flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="h-3 w-3 text-brand-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-tight">
                            {item.description || "Freight Item"}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{item.itemRef}</p>
                        </div>
                      </div>
                      <div className="col-span-2 hidden sm:block text-center">
                        <p className="text-xs text-gray-500">
                          {item.shippingType === "sea"
                            ? `${getCbm(item).toFixed(4)} m³`
                            : item.weight ? `${item.weight} kg` : "—"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.shippingType ?? "sea"}</p>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right">
                        <p className="text-sm font-semibold text-gray-800">
                          {formatCurrency(Math.round(pricePerItem * 100) / 100)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">× 1</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
                  <div className="animate-spin h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full" />
                  Loading items…
                </div>
              )}
            </div>

            {/* Totals box */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.invoiceAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax (0%)</span>
                  <span>GHS 0.00</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200 text-base">
                  <span>Total</span>
                  <span>{formatCurrency(order.invoiceAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-500 pt-1">
                  <span>Amount Paid</span>
                  <span className={isPaid ? "text-green-600 font-medium" : ""}>
                    {isPaid ? formatCurrency(order.invoiceAmount) : "GHS 0.00"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-700">Balance Due</span>
                  <span className={isPaid ? "text-green-600" : "text-rose-600"}>
                    {isPaid ? "GHS 0.00" : formatCurrency(order.invoiceAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status */}
            {isPaid ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Payment Confirmed</p>
                  <p className="text-xs text-green-600 mt-0.5">Thank you — your invoice has been paid in full.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Payment Due</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Please pay <strong>{formatCurrency(order.invoiceAmount)}</strong> by{" "}
                    <strong>{formatDate(dueDate.toISOString())}</strong>. Contact Pakkmaxx via WhatsApp to arrange payment.
                  </p>
                </div>
              </div>
            )}

            {order.notes && (
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
                <span className="font-medium text-gray-500">Note: </span>{order.notes}
              </p>
            )}

            {/* Footer */}
            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-300">Pakkmaxx · USA to Ghana Freight Forwarding</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
