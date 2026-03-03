"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Customer, Item, Order } from "@/types";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Tag,
  Package,
  ShoppingCart,
  Edit,
  Trash2,
} from "lucide-react";
import axios from "axios";

interface CustomerDetail extends Customer {
  items: Item[];
  orders: Order[];
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { error, success } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/customers/${id}`);
        setCustomer(res.data.data);
      } catch {
        error("Failed to load customer");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, error]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/customers/${id}`);
      success("Customer deactivated");
      router.push("/admin/customers");
    } catch {
      error("Failed to deactivate customer");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={customer.name} subtitle={customer.shippingMark} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/customers/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Deactivate customer?</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                >
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{customer.name}</p>
                  <StatusBadge status={customer.status} />
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                <InfoRow icon={Phone} label="Phone" value={customer.phone} />
                <InfoRow
                  icon={MapPin}
                  label="Shipping Address"
                  value={customer.shippingAddress}
                />
                <InfoRow icon={Tag} label="Shipping Mark">
                  <code className="text-xs font-mono bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold">
                    {customer.shippingMark}
                  </code>
                </InfoRow>
                <InfoRow
                  icon={Package}
                  label="Total Items"
                  value={String(customer.items?.length ?? 0)}
                />
                <InfoRow
                  icon={ShoppingCart}
                  label="Total Orders"
                  value={String(customer.orders?.length ?? 0)}
                />
                <InfoRow
                  icon={Package}
                  label="Member Since"
                  value={formatDate(customer.createdAt)}
                />
              </div>

              {customer.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items + Orders */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Items</h3>
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/admin/items/new?customerId=${id}`)
                  }
                >
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  Add Item
                </Button>
              </div>
              <DataTable
                columns={[
                  {
                    key: "itemRef",
                    header: "Ref",
                    render: (item) => (
                      <span className="font-mono text-xs font-bold">
                        {item.itemRef}
                      </span>
                    ),
                  },
                  {
                    key: "description",
                    header: "Description",
                    render: (item) => (
                      <span className="text-sm truncate max-w-[180px] block">
                        {item.description}
                      </span>
                    ),
                  },
                  {
                    key: "weight",
                    header: "Weight",
                    render: (item) => (
                      <span className="text-sm">{item.weight} kg</span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (item) => <StatusBadge status={item.status} />,
                  },
                  {
                    key: "dateReceived",
                    header: "Received",
                    render: (item) => (
                      <span className="text-xs text-gray-500">
                        {formatDate(item.dateReceived)}
                      </span>
                    ),
                  },
                ]}
                data={customer.items ?? []}
                keyExtractor={(item) => item.id}
                emptyMessage="No items yet"
                onRowClick={(item) =>
                  router.push(`/admin/items/${item.id}`)
                }
              />
            </div>

            {/* Orders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Orders</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/orders/new?customerId=${id}`)
                  }
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                  New Order
                </Button>
              </div>
              <DataTable
                columns={[
                  {
                    key: "orderRef",
                    header: "Order",
                    render: (o) => (
                      <span className="font-mono text-xs font-bold">
                        {o.orderRef}
                      </span>
                    ),
                  },
                  {
                    key: "invoiceAmount",
                    header: "Amount",
                    render: (o) => (
                      <span className="font-semibold">
                        {formatCurrency(o.invoiceAmount)}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (o) => <StatusBadge status={o.status} />,
                  },
                  {
                    key: "invoiceDate",
                    header: "Date",
                    render: (o) => (
                      <span className="text-xs text-gray-500">
                        {formatDate(o.invoiceDate)}
                      </span>
                    ),
                  },
                ]}
                data={customer.orders ?? []}
                keyExtractor={(o) => o.id}
                emptyMessage="No orders yet"
                onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {children ?? (
          <p className="text-sm text-gray-800 font-medium break-words">
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}
