"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { Container, Item, ContainerStatus } from "@/types";
import {
  ArrowLeft,
  Package,
  Trash2,
  RefreshCw,
  Plus,
  Container as ContainerIcon,
} from "lucide-react";
import axios from "axios";

interface ContainerDetail extends Container {
  items: Item[];
}

const STATUS_OPTIONS = [
  { value: "Loading", label: "Loading" },
  { value: "Shipped to Ghana", label: "Shipped to Ghana" },
  { value: "Arrived in Ghana", label: "Arrived in Ghana" },
  { value: "Completed", label: "Completed" },
];

export default function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<ContainerStatus>("Loading");
  const [addItemId, setAddItemId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/containers/${id}`);
      setContainer(res.data.data);
      setNewStatus(res.data.data.status);
    } catch {
      error("Failed to load container");
    } finally {
      setLoading(false);
    }
  }, [id, error]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/containers/${id}`);
      success("Container deleted");
      router.push("/admin/containers");
    } catch {
      error("Failed to delete container");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const updateStatus = async () => {
    if (!container || newStatus === container.status) return;
    setUpdatingStatus(true);
    try {
      const res = await axios.patch(`/api/containers/${id}/status`, {
        status: newStatus,
      });
      success("Status updated", res.data.message);
      load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to update"
        : "Failed to update";
      error("Error", msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await axios.delete(`/api/containers/${id}/items`, {
        data: { itemId },
      });
      success("Item removed from container");
      load();
    } catch {
      error("Failed to remove item");
    }
  };

  const addItem = async () => {
    if (!addItemId.trim()) return;
    try {
      await axios.post(`/api/containers/${id}/items`, {
        itemId: addItemId.trim(),
      });
      success("Item added to container");
      setAddItemId("");
      load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to add item"
        : "Failed to add item";
      error("Error", msg);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!container) return null;

  return (
    <div className="flex flex-col h-full">
      <Header
        title={container.containerId}
        subtitle={container.name}
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Containers
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete container?</span>
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
              Delete Container
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Container Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ContainerIcon className="h-5 w-5 text-brand-600" />
                Container Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem label="Container ID" value={container.containerId} mono />
              <InfoItem label="Name" value={container.name} />
              <InfoItem label="Status">
                <StatusBadge status={container.status} />
              </InfoItem>
              <InfoItem label="Total Items" value={String(container.items?.length ?? 0)} />
              <InfoItem
                label="Departure"
                value={container.departureDate ? formatDate(container.departureDate) : "—"}
              />
              <InfoItem
                label="Arrival"
                value={container.arrivalDate ? formatDate(container.arrivalDate) : "—"}
              />
              {container.trackingNumber && (
                <InfoItem
                  label="Tracking #"
                  value={container.trackingNumber}
                  mono
                />
              )}

              {/* Status Update */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Update Status
                </p>
                <Select
                  options={STATUS_OPTIONS}
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as ContainerStatus)
                  }
                />
                {newStatus === "Arrived in Ghana" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                    This will automatically update all {container.items?.length} items to "Arrived in Ghana".
                  </p>
                )}
                <Button
                  className="w-full"
                  size="sm"
                  onClick={updateStatus}
                  loading={updatingStatus}
                  disabled={newStatus === container.status}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Items ({container.items?.length ?? 0})
              </h3>

              {/* Add item by ID */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Item Record ID"
                  value={addItemId}
                  onChange={(e) => setAddItemId(e.target.value)}
                  className="h-8 text-xs px-3 border border-gray-200 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <Button size="sm" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
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
                  key: "customerShippingMark",
                  header: "Customer",
                  render: (item) => (
                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.customerShippingMark ?? "—"}
                    </code>
                  ),
                },
                {
                  key: "description",
                  header: "Description",
                  render: (item) => (
                    <span className="text-sm truncate max-w-[160px] block">
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
                  key: "remove",
                  header: "",
                  render: (item) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Remove this item from the container?")) {
                          removeItem(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ),
                },
              ]}
              data={container.items ?? []}
              keyExtractor={(item) => item.id}
              emptyMessage="No items in this container yet"
              emptyIcon={<Package className="h-10 w-10" />}
              onRowClick={(item) => router.push(`/admin/items/${item.id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {children ?? (
        <p
          className={`text-sm font-medium text-gray-900 ${
            mono ? "font-mono" : ""
          }`}
        >
          {value ?? "—"}
        </p>
      )}
    </div>
  );
}
