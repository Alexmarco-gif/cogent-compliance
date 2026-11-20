"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { KnowledgeListSkeleton } from "@/components/shell/WorkspaceSkeletons";
import {
  Plus,
  Percent,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  FileCheck,
} from "lucide-react";
import { extractApiError, unwrapApiList } from "@/lib/api-client";
import type { CampaignProduct } from "@/contracts/knowledge-product.contracts";

const productListCache = new Map<string, CampaignProduct[]>();

export function ProductRateEditor() {
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const cachedProducts = orgId ? productListCache.get(orgId) : undefined;
  const [products, setProducts] = useState<CampaignProduct[]>(() => cachedProducts || []);
  const [loading, setLoading] = useState(!cachedProducts);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CampaignProduct | null>(null);

  // Form State
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("DIGITAL_LENDING");
  const [description, setDescription] = useState("");
  const [interestMin, setInterestMin] = useState<number | "">(4.0);
  const [interestMax, setInterestMax] = useState<number | "">(6.0);
  const [rateType, setRateType] = useState<"APR" | "MONTHLY" | "FLAT">("MONTHLY");
  const [processingFee, setProcessingFee] = useState<number | "">(1.5);
  const [managementFee, setManagementFee] = useState<number | "">(0);
  const [tenorMinDays, setTenorMinDays] = useState<number | "">(30);
  const [tenorMaxDays, setTenorMaxDays] = useState<number | "">(90);
  const [disclaimers, setDisclaimers] = useState<string>(
    "Subject to credit appraisal. Terms & conditions apply. Licensed by the Central Bank of Nigeria."
  );
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!isSignedIn || !orgId) {
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    try {
      const hasCached = productListCache.has(orgId);
      if (!hasCached) setLoading(true);
      const res = await fetch("/api/marketing-shield/v1/products");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const parsed = extractApiError(res.status, json, "Unable to load product schedules");
        setErrorStatus(parsed.status);
        throw new Error(parsed.message);
      }
      const list = unwrapApiList<CampaignProduct>(json);
      productListCache.set(orgId, list);
      setProducts(list);
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, orgId]);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (orgId && productListCache.has(orgId)) {
      setProducts(productListCache.get(orgId)!);
      setLoading(false);
    }
    fetchProducts();
  }, [clerkLoaded, isSignedIn, orgId, fetchProducts]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductName("");
    setProductType("DIGITAL_LENDING");
    setDescription("");
    setInterestMin(4.0);
    setInterestMax(6.0);
    setRateType("MONTHLY");
    setProcessingFee(1.5);
    setManagementFee(0);
    setTenorMinDays(30);
    setTenorMaxDays(90);
    setDisclaimers(
      "Subject to credit appraisal. Terms & conditions apply. Licensed by the Central Bank of Nigeria."
    );
    setModalOpen(true);
  };

  const openEditModal = (prod: CampaignProduct) => {
    setEditingProduct(prod);
    setProductName(prod.product_name);
    setProductType(prod.product_type);
    setDescription(prod.description || "");
    const terms = prod.approved_terms || {};
    setInterestMin(terms.interest_rate_min ?? "");
    setInterestMax(terms.interest_rate_max ?? "");
    setRateType((terms.interest_rate_type as "APR" | "MONTHLY" | "FLAT") || "MONTHLY");
    setProcessingFee(terms.processing_fee_percent ?? "");
    setManagementFee(terms.management_fee_percent ?? "");
    setTenorMinDays(terms.tenor_min_days ?? "");
    setTenorMaxDays(terms.tenor_max_days ?? "");
    setDisclaimers((terms.required_disclosures || []).join("\n"));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    setSaving(true);
    try {
      const approvedTerms = {
        interest_rate_min: interestMin !== "" ? Number(interestMin) : undefined,
        interest_rate_max: interestMax !== "" ? Number(interestMax) : undefined,
        interest_rate_type: rateType,
        processing_fee_percent: processingFee !== "" ? Number(processingFee) : undefined,
        management_fee_percent: managementFee !== "" ? Number(managementFee) : undefined,
        tenor_min_days: tenorMinDays !== "" ? Number(tenorMinDays) : undefined,
        tenor_max_days: tenorMaxDays !== "" ? Number(tenorMaxDays) : undefined,
        required_disclosures: disclaimers
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const payload = {
        product_name: productName.trim(),
        product_type: productType,
        description: description.trim() || undefined,
        approved_terms: approvedTerms,
      };

      if (editingProduct) {
        const res = await fetch(`/api/marketing-shield/v1/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const errJson = await res.json().catch(() => ({}));
        if (!res.ok || errJson.success === false) {
          throw new Error(extractApiError(res.status, errJson, "Failed to update product schedule").message);
        }
      } else {
        const res = await fetch("/api/marketing-shield/v1/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const errJson = await res.json().catch(() => ({}));
        if (!res.ok || errJson.success === false) {
          throw new Error(extractApiError(res.status, errJson, "Failed to create product schedule").message);
        }
      }

      setModalOpen(false);
      await fetchProducts();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product schedule?")) return;
    try {
      const res = await fetch(`/api/marketing-shield/v1/products/${id}`, { method: "DELETE" });
      const errJson = await res.json().catch(() => ({}));
      if (!res.ok || errJson.success === false) {
        throw new Error(extractApiError(res.status, errJson, "Failed to delete product schedule").message);
      }
      await fetchProducts();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">
            Approved Product Schedules
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Verified interest rates, fees, tenors, and mandatory disclosures used to check campaign claims.
          </p>
        </div>
        {isSignedIn && orgId && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        )}
      </div>

      {clerkLoaded && !isSignedIn ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg space-y-2.5">
          <FileCheck className="w-7 h-7 mx-auto text-zinc-400" />
          <p className="text-xs font-medium text-zinc-900">Sign in to manage product schedules</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Product rate cards are scoped to your organization workspace.
          </p>
          <div className="pt-1">
            <Link
              href="/sign-in"
              className="inline-flex items-center px-3.5 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : clerkLoaded && isSignedIn && !orgId ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg space-y-2">
          <FileCheck className="w-7 h-7 mx-auto text-zinc-400" />
          <p className="text-xs font-medium text-zinc-900">Select an organization workspace</p>
          <p className="text-xs text-zinc-500">
            Choose or create an organization in the sidebar to view and edit product schedules.
          </p>
        </div>
      ) : error ? (
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-md flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          {errorStatus === 401 ? (
            <Link
              href="/sign-in"
              className="px-2.5 py-1 rounded bg-zinc-900 text-white font-medium hover:bg-zinc-800 shrink-0"
            >
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={fetchProducts}
              className="px-2.5 py-1 rounded border border-rose-200 bg-white text-rose-800 font-medium hover:bg-rose-50 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      ) : loading ? (
        <KnowledgeListSkeleton rows={3} />
      ) : products.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg">
          <FileCheck className="w-7 h-7 mx-auto text-zinc-400 mb-2" />
          <p className="text-xs font-medium text-zinc-800">No product schedules configured yet.</p>
          <p className="text-xs text-zinc-500 mt-1">
            Add your approved loan, deposit, or investment rate cards so campaign reviews verify rates and fees accurately.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((prod) => {
            const terms = prod.approved_terms || {};
            return (
              <div
                key={prod.id}
                className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-xs hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 mb-1">
                      {prod.product_type}
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-900">{prod.product_name}</h3>
                    {prod.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{prod.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded-sm hover:bg-zinc-50"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded-sm hover:bg-zinc-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Truth Numbers */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-50 rounded border border-zinc-100 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Percent className="w-3 h-3 text-zinc-400" />
                      <span>Interest ({terms.interest_rate_type || "APR"})</span>
                    </div>
                    <div className="font-semibold text-zinc-800 mt-0.5">
                      {terms.interest_rate_min ?? 0}% - {terms.interest_rate_max ?? 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Processing Fee</div>
                    <div className="font-semibold text-zinc-800 mt-0.5">
                      {terms.processing_fee_percent !== undefined ? `${terms.processing_fee_percent}%` : "0%"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>Tenor Limit</span>
                    </div>
                    <div className="font-semibold text-zinc-800 mt-0.5">
                      {terms.tenor_max_days ? `Up to ${terms.tenor_max_days}d` : "None"}
                    </div>
                  </div>
                </div>

                {/* Mandatory Disclosures */}
                {terms.required_disclosures && terms.required_disclosures.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-semibold text-zinc-400">
                      Mandatory Disclosures
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {terms.required_disclosures.map((disc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[240px]">{disc}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Product Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">
                {editingProduct ? "Edit Product Schedule" : "Create Product Schedule"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QuickCash Salary Advance"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Product Category</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                  >
                    <option value="DIGITAL_LENDING">Digital Lending</option>
                    <option value="SAVINGS">Savings & Deposit</option>
                    <option value="INVESTMENT">Investment & Wealth</option>
                    <option value="PAYMENTS">Payments & Wallets</option>
                    <option value="SME_CREDIT">SME Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Rate Basis</label>
                  <select
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value as "APR" | "MONTHLY" | "FLAT")}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                  >
                    <option value="MONTHLY">Monthly Interest (%)</option>
                    <option value="APR">Annual Percentage Rate (APR %)</option>
                    <option value="FLAT">Flat Fee (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Min Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestMin}
                    onChange={(e) => setInterestMin(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Max Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestMax}
                    onChange={(e) => setInterestMax(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Processing Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={processingFee}
                    onChange={(e) => setProcessingFee(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Max Tenor (Days)</label>
                  <input
                    type="number"
                    value={tenorMaxDays}
                    onChange={(e) => setTenorMaxDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Mandatory Disclosures (one per line)
                </label>
                <textarea
                  rows={3}
                  value={disclaimers}
                  onChange={(e) => setDisclaimers(e.target.value)}
                  placeholder="e.g. Terms & conditions apply&#10;Licensed by CBN"
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded focus:border-zinc-900 outline-none focus:outline-none focus-visible:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-zinc-600 hover:text-zinc-800 rounded border border-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-white bg-zinc-900 hover:bg-zinc-800 rounded font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
