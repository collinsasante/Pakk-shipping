"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, X } from "lucide-react";
import { uploadPhotos } from "@/lib/uploadPhotos";
import axios from "axios";

export default function NewProductCatalogPage() {
  const router = useRouter();
  const { error, success } = useToast();
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    productName: "",
    description: "",
    baseCost: "",
    materialSpecs: "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photoFiles.length);
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim()) { error("Product name is required"); return; }
    setSaving(true);
    try {
      let referenceImages: string[] = [];
      if (photoFiles.length > 0) {
        const uploaded = await uploadPhotos(photoFiles, "pakkmaxx/catalog");
        referenceImages = uploaded.map((u) => u.url);
      }
      await axios.post("/api/product-catalog", {
        productName: form.productName.trim(),
        description: form.description || undefined,
        baseCost: form.baseCost ? Number(form.baseCost) : undefined,
        materialSpecs: form.materialSpecs || undefined,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      });
      success("Catalog entry created");
      router.push("/admin/catalog");
    } catch {
      error("Failed to create catalog entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Add Product" subtitle="Add a new product to the master catalog" />

      <div className="flex-1 p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(e) => set("productName", e.target.value)}
                  placeholder="e.g. Bluetooth Neckband Earphones"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="Describe the product..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Cost (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.baseCost}
                  onChange={(e) => set("baseCost", e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Specs</label>
                <textarea
                  value={form.materialSpecs}
                  onChange={(e) => set("materialSpecs", e.target.value)}
                  rows={2}
                  placeholder="Materials, dimensions, variants..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Images</label>
                {photoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photoPreviews.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div key={src} className="relative">
                        <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photoFiles.length < 5 && (
                  <label className="flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 cursor-pointer hover:border-brand-300 hover:text-brand-600 transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    Add images
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Add Product"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
