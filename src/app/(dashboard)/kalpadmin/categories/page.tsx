"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Tag,
  Plus,
  FolderTree,
  Pencil,
  Trash2,
  Eye,
  Rows4,
  List,
  Upload,
  Search,
  ChevronDown,
  Sparkles,
  Filter,
  Globe,
  Package,
  Briefcase,
  BookOpen,
  Settings2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AdminAuthProvider";
import { canRoleMutateUi } from "@/lib/role-scope";
import { ImportModal } from "@/components/mongoDb/ImportModal";
import {
  CATEGORY_TEMPLATE_OPTIONS,
  defaultCategoryTemplateForType,
  getCategoryTemplateLabel,
  normalizeCategoryTemplateKey,
} from "@/lib/commerce-template-options";
import { AppDispatch, RootState } from "@/redux/store";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/redux/slices/categories/categoriesThunk";
import {
  CategoryRecord,
  CategoryType,
} from "@/redux/slices/categories/categoriesSlices";

type CategoryDraft = {
  name: string;
  slug: string;
  type: CategoryType;
  parentId: string | null;
  description: string;
  templateKey: string;
  pageTitle: string;
  pageStatus: "draft" | "published" | "archived";
  pageBannerImage: string;
  pageContent: string;
  pageMetaTitle: string;
  pageMetaDescription: string;
  galleryInput: string;
};

function resolveCategoryType(value: unknown): CategoryType {
  if (value === "portfolio" || value === "blog") return value;
  return "product";
}

function createDraft(type: CategoryType = "product"): CategoryDraft {
  return {
    name: "",
    slug: "",
    type,
    parentId: null,
    description: "",
    templateKey: defaultCategoryTemplateForType(type),
    pageTitle: "",
    pageStatus: "draft",
    pageBannerImage: "",
    pageContent: "",
    pageMetaTitle: "",
    pageMetaDescription: "",
    galleryInput: "",
  };
}

function toDraft(record: CategoryRecord): CategoryDraft {
  const normalizedType: CategoryType = record.type || "product";
  const normalizedTemplate = normalizeCategoryTemplateKey(
    record.page?.templateKey || record.templateKey,
    defaultCategoryTemplateForType(normalizedType),
  );
  return {
    name: record.name || "",
    slug: record.slug || "",
    type: normalizedType,
    parentId: record.parentId || null,
    description: record.description || "",
    templateKey: normalizedTemplate,
    pageTitle: record.page?.title || record.name || "",
    pageStatus: record.page?.status || "draft",
    pageBannerImage: record.page?.bannerImage || "",
    pageContent: record.page?.content || "",
    pageMetaTitle: record.page?.seo?.metaTitle || "",
    pageMetaDescription: record.page?.seo?.metaDescription || "",
    galleryInput: Array.isArray(record.page?.gallery)
      ? record.page!.gallery!.map((item) => item.url).join(", ")
      : "",
  };
}

function toPayload(draft: CategoryDraft) {
  const gallery = draft.galleryInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url, index) => ({ url, alt: "", order: index }));

  return {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    type: draft.type,
    parentId: draft.parentId || null,
    description: draft.description.trim(),
    templateKey: normalizeCategoryTemplateKey(
      draft.templateKey,
      defaultCategoryTemplateForType(draft.type),
    ),
    page: {
      title: draft.pageTitle.trim() || draft.name.trim(),
      content: draft.pageContent,
      bannerImage: draft.pageBannerImage.trim(),
      gallery,
      templateKey: normalizeCategoryTemplateKey(
        draft.templateKey,
        defaultCategoryTemplateForType(draft.type),
      ),
      status: draft.pageStatus,
      seo: {
        metaTitle:
          draft.pageMetaTitle.trim() ||
          draft.pageTitle.trim() ||
          draft.name.trim(),
        metaDescription: draft.pageMetaDescription.trim(),
      },
    },
  };
}

function readTenantKeyFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )kalp_active_tenant=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function CategoriesPage() {
  const { currentProfile, isScopedRoleView } = useAuth();
  const canMutate = canRoleMutateUi(currentProfile);
  const dispatch = useDispatch<AppDispatch>();

  const {
    allCategories: categories,
    categoryLoading: loading,
    categoryError,
  } = useSelector((state: RootState) => state.categories);

  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CategoryType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<CategoryDraft>(() => createDraft("product"));
  const [previewTemplateByCategoryId, setPreviewTemplateByCategoryId] =
    useState<Record<string, string>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (categories.length > 0) {
      setPreviewTemplateByCategoryId((prev) => {
        const next = { ...prev };
        for (const row of categories) {
          if (!row?._id || typeof row._id !== "string") continue;
          const type = resolveCategoryType(row.type);
          if (!next[row._id]) {
            next[row._id] = normalizeCategoryTemplateKey(
              row?.page?.templateKey || row?.templateKey,
              defaultCategoryTemplateForType(type),
            );
          }
        }
        return next;
      });
    }
  }, [categories]);

  useEffect(() => {
    if (categoryError) {
      showToast(categoryError);
    }
  }, [categoryError]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const resetForm = () => {
    setForm(createDraft(typeFilter || "product"));
    setEditingId(null);
    setShowForm(false);
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const keyword = searchQuery.toLowerCase().trim();
    return categories.filter((cat) => {
      const haystack = [cat.name, cat.slug, cat.description, cat.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [categories, searchQuery]);

  const totals = useMemo(
    () => ({
      all: categories.length,
      product: categories.filter((item) => item.type === "product").length,
      portfolio: categories.filter((item) => item.type === "portfolio").length,
      blog: categories.filter((item) => item.type === "blog").length,
    }),
    [categories],
  );

  const openCreate = () => {
    if (!canMutate) return;
    setForm(createDraft(typeFilter || "product"));
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (record: CategoryRecord) => {
    if (!canMutate) return;
    setForm(toDraft(record));
    setEditingId(record._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!canMutate) return;
    const payload = toPayload(form);
    if (!payload.name) {
      showToast("Category name is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await dispatch(updateCategory({ id: editingId, payload })).unwrap();
        showToast("Category updated!");
      } else {
        await dispatch(createCategory(payload)).unwrap();
        showToast("Category created!");
      }
      resetForm();
    } catch (err: any) {
      showToast(err?.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: CategoryRecord) => {
    if (!canMutate) return;
    if (!confirm(`Delete category "${record.name}"?`)) return;
    try {
      await dispatch(deleteCategory(record._id)).unwrap();
      showToast("Category deleted!");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete category.");
    }
  };

  const openPreview = (record: CategoryRecord, templateOverride?: string) => {
    const tenantKey = readTenantKeyFromCookie();
    if (!tenantKey) {
      showToast("Active tenant key not found.");
      return;
    }
    const type = resolveCategoryType(record.type);
    const selectedTemplate = normalizeCategoryTemplateKey(
      templateOverride || record.page?.templateKey || record.templateKey,
      defaultCategoryTemplateForType(type),
    );
    const encodedSlug = encodeURIComponent(`${tenantKey}--${record.slug}`);
    const url = `/c/${encodedSlug}?tenant=${encodeURIComponent(tenantKey)}&preview=1&previewTemplate=${encodeURIComponent(selectedTemplate)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const typeColors: Record<string, string> = {
    product: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    portfolio: "border-purple-500/40 bg-purple-500/10 text-purple-400",
    blog: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  };

  const typeIcons: Record<string, any> = {
    product: Package,
    portfolio: Briefcase,
    blog: BookOpen,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-5 py-3 shadow-2xl backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
              <Sparkles size={16} className="text-yellow-400" />
            </div>
            <span className="text-sm font-semibold text-white">{toast}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        {/* Read-only Warning */}
        {!canMutate && (
          <div className="animate-in slide-in-from-top-3 fade-in duration-300 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/20 p-2">
                <Settings2 size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Read-Only Mode
                </p>
                <p className="text-xs text-amber-200/80">
                  {isScopedRoleView
                    ? "Scoped role view is read-only. Switch role to create or edit categories."
                    : "This role is read-only for category mutations."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-slate-50 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-slate-50 blur-3xl"></div>

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-600 shadow-lg shadow-purple-500/20">
                <FolderTree size={32} className="text-white" />
              </div>
              <div>
                <h1
                  className="mb-2 text-4xl font-black tracking-tight text-slate-900"
                  id="category-management-title"
                >
                  Category Management
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  Organize your content with categories. Each category can
                  publish its own frontend page with custom templates, SEO
                  settings, and rich content.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  id="view-mode-grid"
                >
                  <Rows4 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    viewMode === "list"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  id="view-mode-list"
                >
                  <List size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                disabled={!canMutate}
                className="group flex items-center gap-2 rounded-xl border-2 border-purple-500/30 bg-purple-500/10 px-5 py-2.5 font-bold text-purple-400 transition-all hover:border-purple-500/50 hover:bg-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                id="import-json-btn"
              >
                <Upload
                  size={18}
                  className="transition-transform group-hover:scale-110"
                />
                Import JSON
              </button>
              <button
                onClick={openCreate}
                disabled={!canMutate}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                id="add-category-btn"
              >
                <Plus
                  size={18}
                  className="transition-transform group-hover:rotate-90"
                />
                Add Category
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="group rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Globe size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.all}
                  </p>
                  <p className="text-xs text-slate-500">All Categories</p>
                </div>
              </div>
            </div>
            <div className="group rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Package size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.product}
                  </p>
                  <p className="text-xs text-slate-500">Product</p>
                </div>
              </div>
            </div>
            <div className="group rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Briefcase size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.portfolio}
                  </p>
                  <p className="text-xs text-slate-500">Portfolio</p>
                </div>
              </div>
            </div>
            <div className="group rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <BookOpen size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.blog}
                  </p>
                  <p className="text-xs text-slate-500">Blog</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="category-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
            />
          </div>

          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              id="category-type-filter"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as CategoryType | "")
              }
              className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 shadow-sm transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
            >
              <option value="">All Types</option>
              <option value="product">Product</option>
              <option value="portfolio">Portfolio</option>
              <option value="blog">Blog</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <section className="animate-in slide-in-from-top-5 fade-in duration-300 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-50 p-2 text-slate-900">
                  <FolderTree size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingId ? "Edit Category" : "Create New Category"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editingId
                      ? "Update the details below"
                      : "Fill in the details to create a new category"}
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="rounded-xl bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Category Name
                  </label>
                  <input
                    id="form-category-name"
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Mountain Bikes"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Slug
                  </label>
                  <input
                    id="form-category-slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="mountain-bikes"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Type
                  </label>
                  <select
                    id="form-category-type"
                    value={form.type}
                    onChange={(e) => {
                      const nextType = e.target.value as CategoryType;
                      setForm((prev) => ({
                        ...prev,
                        type: nextType,
                        templateKey: defaultCategoryTemplateForType(nextType),
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  >
                    <option value="product">Product</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="blog">Blog</option>
                  </select>
                </div>
              </div>

              {/* Parent & Template */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Parent Category
                  </label>
                  <select
                    id="form-category-parent"
                    value={form.parentId || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        parentId: e.target.value || null,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  >
                    <option value="">None (Top Level)</option>
                    {categories
                      .filter(
                        (cat) =>
                          cat.type === form.type && cat._id !== editingId,
                      )
                      .map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Template
                  </label>
                  <select
                    id="form-category-template"
                    value={form.templateKey}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        templateKey: normalizeCategoryTemplateKey(
                          e.target.value,
                          defaultCategoryTemplateForType(prev.type),
                        ),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  >
                    {CATEGORY_TEMPLATE_OPTIONS.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Page Status
                  </label>
                  <select
                    id="form-category-status"
                    value={form.pageStatus}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pageStatus: e.target
                          .value as CategoryDraft["pageStatus"],
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Preview Button for Edit Mode */}
              {editingId && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <Eye size={18} className="text-slate-900" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Preview Template
                    </p>
                    <p className="text-xs text-slate-500">
                      View how this category will look with the selected
                      template
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openPreview(
                        {
                          _id: editingId,
                          name: form.name,
                          slug: form.slug,
                          type: form.type,
                          templateKey: form.templateKey,
                          page: {
                            templateKey: form.templateKey,
                            status: form.pageStatus,
                          },
                        } as CategoryRecord,
                        form.templateKey,
                      )
                    }
                    className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    Preview
                  </button>
                </div>
              )}

              {/* Page Title */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Page Title
                </label>
                <input
                  id="form-category-page-title"
                  type="text"
                  value={form.pageTitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pageTitle: e.target.value }))
                  }
                  placeholder="Custom page title (optional)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                />
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Banner Image URL
                  </label>
                  <input
                    id="form-category-banner"
                    type="text"
                    value={form.pageBannerImage}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pageBannerImage: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/banner.jpg"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Gallery URLs (comma separated)
                  </label>
                  <input
                    id="form-category-gallery"
                    type="text"
                    value={form.galleryInput}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        galleryInput: e.target.value,
                      }))
                    }
                    placeholder="url1.jpg, url2.jpg, url3.jpg"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* Content & Description */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Page Content (HTML/Text)
                  </label>
                  <textarea
                    id="form-category-content"
                    rows={4}
                    value={form.pageContent}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pageContent: e.target.value,
                      }))
                    }
                    placeholder="Rich content for the category page..."
                    className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-white transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Category Description
                  </label>
                  <textarea
                    id="form-category-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of this category..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* SEO */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Meta Title
                  </label>
                  <input
                    id="form-category-meta-title"
                    type="text"
                    value={form.pageMetaTitle}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pageMetaTitle: e.target.value,
                      }))
                    }
                    placeholder="SEO meta title"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Meta Description
                  </label>
                  <input
                    id="form-category-meta-desc"
                    type="text"
                    value={form.pageMetaDescription}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pageMetaDescription: e.target.value,
                      }))
                    }
                    placeholder="SEO meta description"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  id="submit-category-btn"
                  onClick={handleSubmit}
                  disabled={saving || !canMutate}
                  className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles
                    size={16}
                    className="transition-transform group-hover:scale-110"
                  />
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Category"
                      : "Create Category"}
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 font-bold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Categories Grid/List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 shadow-sm">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-slate-900"></div>
            <p className="text-sm font-medium text-slate-500">
              Loading categories...
            </p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <FolderTree size={32} className="text-slate-300" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-800">
              No categories found
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {searchQuery || typeFilter
                ? "Try adjusting your search or filter"
                : "Get started by creating your first category"}
            </p>
            {!searchQuery && !typeFilter && canMutate && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
              >
                <Plus size={16} />
                Create Category
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCategories.map((category, idx) => {
              const TypeIcon = typeIcons[category.type] || Package;
              return (
                <article
                  key={category._id}
                  className="group animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${typeColors[category.type].replace("text-", "bg-").replace("-400", "-50 text-").replace("-300", "-600")}`}
                      >
                        <TypeIcon size={18} />
                      </div>
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${typeColors[category.type].replace("text-", "bg-").replace("-400", "-50 text-").replace("-300", "-600").replace("border-", "border-opacity-0")}`}
                      >
                        {category.type}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <h3 className="mb-1 text-base font-bold text-slate-800 transition-colors group-hover:text-slate-950">
                      {category.name}
                      {category.parentId && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-slate-400">
                          <FolderTree size={10} />
                          {categories.find((c) => c._id === category.parentId)
                            ?.name || "Parent"}
                        </span>
                      )}
                    </h3>
                    <p className="mb-3 font-mono text-xs text-slate-400">
                      /{category.slug}
                    </p>
                    <p className="mb-3 line-clamp-2 text-xs text-slate-500">
                      {category.description || "No description provided."}
                    </p>

                    {/* Template Badge */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">
                        Template:
                      </span>
                      <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {getCategoryTemplateLabel(
                          category.page?.templateKey || category.templateKey,
                          resolveCategoryType(category.type),
                        )}
                      </span>
                    </div>

                    {/* Entity Count */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Tag size={12} />
                      <span>
                        <span className="font-semibold text-slate-800">
                          {category.entityCount || 0}
                        </span>{" "}
                        entities
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    {/* <select
                      value={normalizeCategoryTemplateKey(
                        previewTemplateByCategoryId[category._id] ||
                          category.page?.templateKey ||
                          category.templateKey,
                        defaultCategoryTemplateForType(
                          resolveCategoryType(category.type),
                        ),
                      )}
                      onChange={(e) => {
                        const nextTemplate = normalizeCategoryTemplateKey(
                          e.target.value,
                          defaultCategoryTemplateForType(
                            resolveCategoryType(category.type),
                          ),
                        );
                        setPreviewTemplateByCategoryId((prev) => ({
                          ...prev,
                          [category._id]: nextTemplate,
                        }));
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-600 transition-all focus:border-slate-400 focus:outline-none"
                    >
                      {CATEGORY_TEMPLATE_OPTIONS.map((template) => (
                        <option key={template.key} value={template.key}>
                          {template.label}
                        </option>
                      ))}
                    </select> */}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          openPreview(
                            category,
                            previewTemplateByCategoryId[category._id] ||
                              category.page?.templateKey ||
                              category.templateKey,
                          )
                        }
                        className="rounded-lg bg-slate-50 p-1.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      {canMutate && (
                        <>
                          <button
                            onClick={() => openEdit(category)}
                            className="rounded-lg bg-slate-50 p-1.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="rounded-lg bg-slate-50 p-1.5 text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Template
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Entities
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category, idx) => {
                  const TypeIcon = typeIcons[category.type] || Package;
                  return (
                    <tr
                      key={category._id}
                      className="animate-in fade-in duration-200 border-b border-slate-100 transition-colors hover:bg-slate-50"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-lg p-2 ${typeColors[category.type].replace("text-", "bg-").replace("-400", "-50 text-").replace("-300", "-600")}`}
                          >
                            <TypeIcon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 focus:outline-none">
                              {category.name}
                              {category.parentId && (
                                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-slate-400">
                                  <FolderTree size={10} />
                                  {categories.find(
                                    (c) => c._id === category.parentId,
                                  )?.name || "Parent"}
                                </span>
                              )}
                            </p>
                            <p className="font-mono text-[10px] text-slate-400">
                              /{category.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-lg border border-opacity-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${typeColors[category.type].replace("text-", "bg-").replace("-400", "-50 text-").replace("-300", "-600")}`}
                        >
                          {category.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={normalizeCategoryTemplateKey(
                              previewTemplateByCategoryId[category._id] ||
                                category.page?.templateKey ||
                                category.templateKey,
                              defaultCategoryTemplateForType(
                                resolveCategoryType(category.type),
                              ),
                            )}
                            onChange={(e) => {
                              const nextTemplate = normalizeCategoryTemplateKey(
                                e.target.value,
                                defaultCategoryTemplateForType(
                                  resolveCategoryType(category.type),
                                ),
                              );
                              setPreviewTemplateByCategoryId((prev) => ({
                                ...prev,
                                [category._id]: nextTemplate,
                              }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 transition-all focus:border-slate-400 focus:outline-none"
                          >
                            {CATEGORY_TEMPLATE_OPTIONS.map((template) => (
                              <option key={template.key} value={template.key}>
                                {template.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() =>
                              openPreview(
                                category,
                                previewTemplateByCategoryId[category._id] ||
                                  category.page?.templateKey ||
                                  category.templateKey,
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Tag size={12} />
                          <span>
                            {category.entityCounts?.product || 0}P,{" "}
                            {category.entityCounts?.blog || 0}B,{" "}
                            {category.entityCounts?.portfolio || 0}V
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {canMutate && (
                            <>
                              <button
                                onClick={() => openEdit(category)}
                                className="rounded-lg bg-slate-50 p-1.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(category)}
                                className="rounded-lg bg-slate-50 p-1.5 text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={14} />
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
      </div>

      <ImportModal
        type="category"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
