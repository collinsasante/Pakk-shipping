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

export default function NewSourcingRequestPage() {
  const router = useRouter();
  const { error, success } = useToast();
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");

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
    if (photoFiles.length === 0) { error("Please add at least one photo of the item"); return; }
    if (!description.trim()) { error("Please describe what you're looking for"); return; }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) { error("Quantity must be at least 1"); return; }

    setSaving(true);
    try {
      const uploaded = await uploadPhotos(photoFiles, "pakkmaxx/sourcing");
      await axios.post("/api/sourcing-requests", {
        photos: uploaded.map((u) => u.url),
        description: description.trim(),
        quantity: qty,
      });
      success("Request submitted — we'll be in touch with a quote soon");
      router.push("/customer/sourcing");
    } catch {
      error("Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="New Sourcing Request" subtitle="Tell us what you'd like PAKKmax to source for you" />

      <div className="flex-1 p-6 max-w-2xl overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo <span className="text-red-500">*</span>
                </label>
                {photoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photoPreviews.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div key={src} className="relative">
                        <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
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
                  <label className="flex items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 cursor-pointer hover:border-brand-300 hover:text-brand-600 transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    Add a photo of what you want
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the item — color, size, material, any specific details..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Request"}
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
