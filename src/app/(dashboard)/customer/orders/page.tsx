"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Order, Item } from "@/types";
import { ShoppingCart, ChevronDown, ChevronUp, Package } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/toast";

interface OrderWithItems extends Order {
  items?: Item[];
  _expanded?: boolean;
}

export default function CustomerOrdersPage() {
  const { error } = useToast();
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
      <Header title="My Orders" subtitle="Your invoices and payment status" />

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          orders.map((order) => (
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
                      {formatDate(order.invoiceDate)} ·{" "}
                      {order.itemIds?.length ?? 0} item(s)
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

              {/* Order Details (expanded) */}
              {order._expanded && (
                <div className="border-t border-gray-100 p-5">
                  {order.status === "Pending" && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-sm text-amber-800 font-medium">
                        Payment Pending
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Please arrange payment of{" "}
                        <strong>{formatCurrency(order.invoiceAmount)}</strong>.
                        Contact Pakkmaxx via WhatsApp to complete payment.
                      </p>
                    </div>
                  )}

                  {order.status === "Paid" && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        Payment Confirmed ✓
                      </p>
                    </div>
                  )}

                  {order.notes && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Items in this Order
                  </p>

                  {order.items ? (
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <Package className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.itemRef} · {item.weight} kg
                            </p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
