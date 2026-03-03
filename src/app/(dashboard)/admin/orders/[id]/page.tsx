"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Order, Item } from "@/types";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  CheckCircle,
  User,
  Calendar,
  DollarSign,
  Hash,
  Trash2,
  ExternalLink,
  FileText,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/toast";

interface OrderDetail extends Order {
  items?: Item[];
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-900 font-medium mt-0.5">{value ?? "—"}</p>
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/orders/${id}`);
      setOrder(res.data.data);
    } catch {
      error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id, error]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/orders/${id}`);
      success("Order deleted");
      router.push("/admin/orders");
    } catch {
      error("Failed to delete order");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!order) return;
    setMarkingPaid(true);
    try {
      await axios.patch(`/api/orders/${id}`, { status: "Paid" });
      success("Order marked as paid!", order.orderRef);
      load();
    } catch {
      error("Failed to update order");
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Order not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={order.orderRef}
        subtitle={`Invoice for ${order.customerName ?? "—"}`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/admin/orders")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>

          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={order.status} />
            {order.status === "Pending" && (
              <Button
                size="sm"
                variant="success"
                onClick={handleMarkPaid}
                loading={markingPaid}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Mark as Paid
              </Button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Delete invoice?</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
          {/* Left: Items + Notes */}
          <div className="lg:col-span-2 space-y-5">
            {/* Keepup invoice link */}
            {order.keepupLink && (
              <a
                href={order.keepupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-brand-50 border border-brand-100 rounded-xl p-4 hover:bg-brand-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-900">View Invoice on Keepup</p>
                    <p className="text-xs text-brand-600">Open shareable invoice link</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-brand-600 group-hover:text-brand-800 shrink-0" />
              </a>
            )}

            {order.status === "Pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800">
                  Payment Pending
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Invoice amount:{" "}
                  <strong>{formatCurrency(order.invoiceAmount)}</strong>. Contact
                  the customer via WhatsApp to arrange payment.
                </p>
              </div>
            )}

            {order.status === "Paid" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800">
                  Payment Confirmed ✓
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-brand-600" />
                Items ({order.itemIds?.length ?? 0})
              </h3>

              {order.items && order.items.length > 0 ? (
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => router.push(`/admin/items/${item.id}`)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                    >
                      <Package className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.itemRef} · {item.weight} kg
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No items linked</p>
              )}
            </div>

            {order.notes && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs text-gray-400 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Right: Order Info */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-brand-600" />
                Order Info
              </h3>
              <div className="divide-y divide-gray-50">
                <InfoRow
                  icon={Hash}
                  label="Order Reference"
                  value={order.orderRef}
                />
                <InfoRow
                  icon={User}
                  label="Customer"
                  value={
                    <button
                      onClick={() =>
                        router.push(`/admin/customers/${order.customerId}`)
                      }
                      className="text-brand-600 hover:underline"
                    >
                      {order.customerName}
                    </button>
                  }
                />
                <InfoRow
                  icon={DollarSign}
                  label="Invoice Amount"
                  value={formatCurrency(order.invoiceAmount)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Invoice Date"
                  value={formatDate(order.invoiceDate)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Created"
                  value={formatDate(order.createdAt)}
                />
                {order.keepupLink && (
                  <InfoRow
                    icon={FileText}
                    label="Invoice"
                    value={
                      <a
                        href={order.keepupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline flex items-center gap-1"
                      >
                        Open on Keepup <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
