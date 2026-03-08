"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRY_CODES } from "@/lib/countryCodes";

interface PhoneInputProps {
  code: string;
  local: string;
  onCodeChange: (code: string) => void;
  onLocalChange: (local: string) => void;
  required?: boolean;
  label?: string;
}

export function PhoneInput({ code, local, onCodeChange, onLocalChange, required, label }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = COUNTRY_CODES.filter((cc) =>
    cc.label.toLowerCase().includes(search.toLowerCase()) ||
    cc.code.includes(search)
  );

  const selectedLabel = COUNTRY_CODES.find((cc) => cc.code === code);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex" ref={ref}>
        {/* Country code button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => { setOpen(!open); setSearch(""); }}
            className="inline-flex items-center gap-1.5 h-10 px-3 bg-white border border-gray-200 rounded-l-lg text-sm text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 border-r-0 min-w-[80px]"
          >
            <span className="font-medium">{code}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search country or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 h-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {/* Options */}
              <ul className="max-h-52 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-4 py-2 text-sm text-gray-400">No results</li>
                ) : filtered.map((cc) => (
                  <li key={cc.code + cc.label}>
                    <button
                      type="button"
                      onClick={() => {
                        onCodeChange(cc.code);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${cc.code === code ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700"}`}
                    >
                      <span>{cc.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Phone number input */}
        <input
          type="tel"
          placeholder="Enter number"
          value={local}
          onChange={(e) => onLocalChange(e.target.value)}
          required={required}
          className="flex-1 h-10 px-3 border border-gray-200 rounded-r-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">Select country code then enter your number</p>
    </div>
  );
}
