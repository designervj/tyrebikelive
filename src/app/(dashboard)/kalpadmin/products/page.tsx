"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Truck,
  CreditCard,
  Plus,
  Package,
  Tag,
  Search,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  Upload,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImportModal } from "@/components/mongoDb/ImportModal";
import {
  isEducationContextActive,
  isTravelContextActive,
} from "@/lib/business-context";
import { useAuth } from "@/components/AdminAuthProvider";
import { canRoleMutateUi } from "@/lib/role-scope";
import {
  PRODUCT_TEMPLATE_OPTIONS,
  getProductTemplateLabel,
  normalizeProductTemplateKey,
} from "@/lib/commerce-template-options";
import { useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useDispatch } from "react-redux";
import { setCurrentProduct } from "@/redux/slices/products/productsSlices";
import { deleteProduct } from "@/redux/slices/products/productsThunk";
import { useToast } from "@/hooks/useToast";
import { Toast } from "./studio/components/Toast";

type NavOverride = {
  label?: string;
  path?: string;
};

type VocabularyTerms = {
  catalogPlural?: string;
  catalogSingular?: string;
  categories?: string;
  attributes?: string;
  orders?: string;
};

type AnalyticsSummary = {
  activeBusinessContexts?: string[];
  businessType?: string;
  isTravelContext?: boolean;
  navigationOverrides?: Record<string, NavOverride>;
  vocabularyProfile?: { terms?: VocabularyTerms };
};

type PageVocabulary = {
  hubTitle: string;
  hubDescription: string;
  primaryEntity: string;
  categoryEntity: string;
  orderEntity: string;
  categoryPath: string;
  orderPath: string;
  studioPath: string;
  createPath: string;
  studioCta: string;
  createCta: string;
  totalLabel: string;
  activeLabel: string;
  variantsLabel: string;
  stockLabel: string;
  searchPlaceholder: string;
  emptyState: string;
  variantsColumnLabel: string;
  stockColumnLabel: string;
};

const DEFAULT_VOCAB: PageVocabulary = {
  hubTitle: "Products",
  hubDescription: "Manage your catalog, pricing, stock, and product setup.",
  primaryEntity: "Product",
  categoryEntity: "Categories",
  orderEntity: "Orders",
  categoryPath: "/kalpadmin/categories",
  orderPath: "/kalpadmin/orders",
  studioPath: "/kalpadmin/products/studio",
  createPath: "/kalpadmin/products/studio",
  studioCta: "Open Studio",
  createCta: "New Product",
  totalLabel: "Total Products",
  activeLabel: "Active",
  variantsLabel: "Variants",
  stockLabel: "Stock",
  searchPlaceholder: "Search products...",
  emptyState: 'No products found. Click "New Product" to create one.',
  variantsColumnLabel: "Variants",
  stockColumnLabel: "Stock",
};

const EDUCATION_VOCAB: PageVocabulary = {
  hubTitle: "Programs",
  hubDescription: "Manage your catalog, enrollments, and curriculum setup.",
  primaryEntity: "Program",
  categoryEntity: "Curriculum",
  orderEntity: "Enrollments",
  categoryPath: "/kalpadmin/categories",
  orderPath: "/kalpadmin/orders",
  studioPath: "/kalpadmin/products/studio",
  createPath: "/kalpadmin/products/studio",
  studioCta: "Open Studio",
  createCta: "New Program",
  totalLabel: "Total Programs",
  activeLabel: "Active",
  variantsLabel: "Batches",
  stockLabel: "Seats",
  searchPlaceholder: "Search programs...",
  emptyState: 'No programs found. Click "New Program" to create one.',
  variantsColumnLabel: "Batches",
  stockColumnLabel: "Seats",
};

const TRAVEL_VOCAB: PageVocabulary = {
  hubTitle: "Travel Packages",
  hubDescription: "Manage packages, booking inventory, and travel offerings.",
  primaryEntity: "Travel Package",
  categoryEntity: "Hotels",
  orderEntity: "Orders",
  categoryPath: "/kalpadmin/categories",
  orderPath: "/kalpadmin/orders",
  studioPath: "/kalpadmin/products/studio",
  createPath: "/kalpadmin/products/studio",
  studioCta: "Open Studio",
  createCta: "New Package",
  totalLabel: "Total Packages",
  activeLabel: "Active",
  variantsLabel: "Itineraries",
  stockLabel: "Slots",
  searchPlaceholder: "Search packages...",
  emptyState: 'No packages found. Click "New Package" to create one.',
  variantsColumnLabel: "Days",
  stockColumnLabel: "Slots",
};

const PRODUCT_LISTING_DESCRIPTION_MAX = 160;

function toProductListingExcerpt(
  value: unknown,
  max = PRODUCT_LISTING_DESCRIPTION_MAX,
): string {
  if (typeof value !== "string") return "";
  const plain = value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function readTenantKeyFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )kalp_active_tenant=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function buildVocabulary(summary: AnalyticsSummary | null): PageVocabulary {
  if (!summary) return DEFAULT_VOCAB;

  const contexts = Array.isArray(summary.activeBusinessContexts)
    ? summary.activeBusinessContexts.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const navigationOverrides = summary.navigationOverrides || {};
  const terms = summary.vocabularyProfile?.terms || {};
  const categoriesOverride =
    navigationOverrides["nav.products.categories"] || {};
  const ordersOverride = navigationOverrides["nav.ecommerce.orders"] || {};

  const travelContext =
    Boolean(summary.isTravelContext) || isTravelContextActive(contexts);
  const educationContext = isEducationContextActive(contexts) && !travelContext;

  const base = travelContext
    ? TRAVEL_VOCAB
    : educationContext
      ? EDUCATION_VOCAB
      : DEFAULT_VOCAB;

  return {
    ...base,
    primaryEntity: terms.catalogSingular?.trim() || base.primaryEntity,
    categoryEntity:
      categoriesOverride.label?.trim() ||
      terms.categories?.trim() ||
      base.categoryEntity,
    orderEntity:
      ordersOverride.label?.trim() || terms.orders?.trim() || base.orderEntity,
    categoryPath: categoriesOverride.path?.trim() || base.categoryPath,
    orderPath: ordersOverride.path?.trim() || base.orderPath,
  };
}

function formatCurrency(value: unknown) {
  const number = typeof value === "number" ? value : Number(value || 0);
  return `$${number.toFixed(2)}`;
}

export default function ProductsPage() {
  const { currentProfile, user } = useAuth();
  const canMutate = canRoleMutateUi(currentProfile);
  const router = useRouter();
  const { toast, showToast } = useToast();
  const {
    allProducts: products,
    loading,
    error,
  } = useSelector((state: RootState) => state.products);
  const dispatch = useDispatch<AppDispatch>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [previewTemplateByProductId, setPreviewTemplateByProductId] = useState<
    Record<string, string>
  >({});
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((res) => res.json())
      .then((data) => setSummary(data as AnalyticsSummary))
      .catch(() => setSummary(null));
  }, []);

  const handleEdit = (product: any) => {
    if (!canMutate) return;
    router.push(
      `/kalpadmin/products/studio?id=${encodeURIComponent(product._id)}`,
    );
  };

  const handleDelete = async (id: string) => {
    if (!canMutate) return;
    if (!confirm("Delete this product and all its variants?")) return;
    const action: any = await dispatch(deleteProduct(id));
    if (deleteProduct.fulfilled.match(action)) {
      showToast("Product deleted successfully");
    } else {
      showToast("Failed to delete");
    }
  };

  const handleSlugBackfill = async () => {
    if (!canMutate || backfillBusy) return;

    setBackfillStatus("");
    setBackfillBusy(true);

    try {
      const dryRunRes = await fetch("/api/ecommerce/products/backfill-slugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });

      const dryRunPayload = await dryRunRes.json().catch(() => ({}));

      if (!dryRunRes.ok) {
        throw new Error(
          typeof dryRunPayload?.error === "string"
            ? dryRunPayload.error
            : "Dry-run failed.",
        );
      }

      const affected = Number(dryRunPayload?.affected || 0);

      if (affected <= 0) {
        setBackfillStatus("No missing product slugs detected.");
        return;
      }

      const shouldApply = confirm(
        `Slug backfill will update ${affected} product record(s). Continue?`,
      );

      if (!shouldApply) {
        setBackfillStatus(
          `Backfill cancelled. ${affected} product(s) still missing slug.`,
        );
        return;
      }

      const applyRes = await fetch("/api/ecommerce/products/backfill-slugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });

      const applyPayload = await applyRes.json().catch(() => ({}));

      if (!applyRes.ok) {
        throw new Error(
          typeof applyPayload?.error === "string"
            ? applyPayload.error
            : "Backfill apply failed.",
        );
      }

      const applied = Number(applyPayload?.applied || 0);
      const collisions = Number(applyPayload?.collisionsResolved || 0);

      setBackfillStatus(
        `Slug backfill complete: ${applied} updated${collisions > 0 ? `, ${collisions} collisions resolved` : ""}.`,
      );

      // fetchProducts();
    } catch (error: unknown) {
      setBackfillStatus(
        error instanceof Error ? error.message : "Slug backfill failed.",
      );
    } finally {
      setBackfillBusy(false);
    }
  };

  const openTemplatePreview = (product: any) => {
    const tenantKey =
      readTenantKeyFromCookie() ||
      (typeof user?.tenantKey === "string" ? user.tenantKey : "");

    if (!tenantKey) {
      alert("Active tenant key not found.");
      return;
    }

    const slug = typeof product?.slug === "string" ? product.slug.trim() : "";

    if (!slug) {
      const shouldBackfill = confirm(
        "Product slug not available. This prevents public preview. Would you like to attempt a slug backfill now?",
      );
      if (shouldBackfill) handleSlugBackfill();
      return;
    }

    const selectedTemplate = normalizeProductTemplateKey(
      previewTemplateByProductId[product._id] || product.templateKey,
    );

    const encodedSlug = encodeURIComponent(`${tenantKey}--${slug}`);
    const url = `/product/${encodedSlug}?tenant=${encodeURIComponent(
      tenantKey,
    )}&preview=1&previewTemplate=${encodeURIComponent(selectedTemplate)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === "active").length;
  const totalVariants = products.reduce(
    (sum, p) => sum + Number(p.variants?.length || 0),
    0,
  );
  const totalStock = products.reduce(
    (sum, p) =>
      sum +
      Number(p.variants?.reduce((s, v) => s + Number(v.stock || 0), 0) || 0),
    0,
  );

  const vocab = buildVocabulary(summary);

  const statusMap: Record<
    string,
    { dot: string; badge: string; label: string }
  > = {
    active: {
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      label: "Active",
    },
    draft: {
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      label: "Draft",
    },
    archived: {
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
      label: "Archived",
    },
  };

  const stats = [
    {
      label: vocab.totalLabel,
      value: totalProducts,
      icon: ShoppingBag,
    },
    {
      label: vocab.activeLabel,
      value: activeProducts,
      icon: Package,
    },
    {
      label: vocab.variantsLabel,
      value: totalVariants,
      icon: Tag,
    },
    {
      label: vocab.stockLabel,
      value: totalStock.toLocaleString(),
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-6">
      <Toast toast={toast} />
      <div className="mx-auto max-w-[1500px] space-y-6">
        {!canMutate && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This role is read-only for commerce mutations.
          </div>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.04)] md:px-7 md:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <span>Catalog</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-slate-600">{vocab.hubTitle}</span>
              </div>

              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950 md:text-[34px]">
                {vocab.hubTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {vocab.hubDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={vocab.categoryPath}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Tag size={16} />
                {vocab.categoryEntity}
              </Link>

              <Link
                href={vocab.orderPath}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Truck size={16} />
                {vocab.orderEntity}
              </Link>

              {canMutate && (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Upload size={16} />
                  Import
                </button>
              )}

              <Link
                href={canMutate ? vocab.createPath : "#"}
                aria-disabled={!canMutate}
                onClick={(event) => {
                  if (!canMutate) event.preventDefault();
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
                {vocab.createCta}
              </Link>
            </div>
          </div>
        </section>

        {backfillStatus && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {backfillStatus}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon size={18} />
              </div>
              <div className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={vocab.searchPlaceholder}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {["", "active", "draft", "archived"].map((status) => {
                  const active = statusFilter === status;
                  return (
                    <button
                      key={status || "all"}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-slate-950 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {status
                        ? status.charAt(0).toUpperCase() + status.slice(1)
                        : "All"}
                    </button>
                  );
                })}

                {canMutate && (
                  <button
                    type="button"
                    onClick={handleSlugBackfill}
                    disabled={backfillBusy}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={16}
                      className={backfillBusy ? "animate-spin" : ""}
                    />
                    {backfillBusy ? "Backfilling..." : "Backfill Slugs"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package size={24} />
              </div>
              <p className="text-sm text-slate-500">{vocab.emptyState}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {vocab.primaryEntity}
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {vocab.variantsColumnLabel}
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {vocab.stockColumnLabel}
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => {
                    const descriptionExcerpt = toProductListingExcerpt(
                      product.description,
                    );

                    const templateSnapshotKey = normalizeProductTemplateKey(
                      product.templateKey,
                    );

                    const selectedPreviewTemplate = normalizeProductTemplateKey(
                      previewTemplateByProductId[String(product._id)] ||
                        templateSnapshotKey,
                    );

                    const productStatus =
                      statusMap[product.status] || statusMap.draft;

                    return (
                      <tr
                        key={product._id}
                        className="group transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-5 align-top">
                          <div className="max-w-[420px]">
                            <div className="flex items-center gap-2">
                              <h3
                                className="truncate text-sm font-semibold text-slate-900"
                                title={product.name}
                              >
                                {product.name}
                              </h3>

                              {!product.slug && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSlugBackfill();
                                  }}
                                  className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200"
                                  title="Missing slug. Click to backfill."
                                >
                                  Missing slug
                                </button>
                              )}
                            </div>

                            <p
                              className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500"
                              title={descriptionExcerpt || ""}
                            >
                              {descriptionExcerpt || "No description provided"}
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">
                                Template
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                                {getProductTemplateLabel(templateSnapshotKey)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 align-top">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs text-slate-700">
                            {product.sku || "—"}
                          </span>
                        </td>

                        <td className="px-6 py-5 align-top text-sm font-semibold text-slate-900">
                          {formatCurrency(product.pricing?.price)}
                        </td>

                        <td className="px-6 py-5 align-top text-sm text-slate-600">
                          {product.variants?.length || 0}
                        </td>

                        <td className="px-6 py-5 align-top text-sm text-slate-600">
                          {(
                            product.variants?.reduce(
                              (s, v) => s + Number(v.stock || 0),
                              0,
                            ) || 0
                          ).toLocaleString()}
                        </td>

                        <td className="px-6 py-5 align-top">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${productStatus.badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${productStatus.dot}`}
                            />
                            {productStatus.label}
                          </span>
                        </td>

                        <td className="px-6 py-5 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={selectedPreviewTemplate}
                              onChange={(event) => {
                                const nextTemplate =
                                  normalizeProductTemplateKey(
                                    event.target.value,
                                  );
                                setPreviewTemplateByProductId((prev) => ({
                                  ...prev,
                                  [String(product._id)]: nextTemplate,
                                }));
                              }}
                              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-slate-300"
                              title="Preview template"
                            >
                              {PRODUCT_TEMPLATE_OPTIONS.map((template) => (
                                <option key={template.key} value={template.key}>
                                  {template.label}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => openTemplatePreview(product)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              title="Preview"
                            >
                              <Eye size={15} />
                            </button>

                            {canMutate && (
                              <>
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                  title="Edit"
                                >
                                  <Pencil size={15} />
                                </button>

                                <button
                                  onClick={() =>
                                    handleDelete(String(product._id))
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ImportModal
          type="product"
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      </div>
    </div>
  );
}
