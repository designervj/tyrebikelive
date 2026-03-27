"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ListFilter,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Copy,
  CheckCircle2,
  Circle,
  Settings2,
  Upload,
  Search,
  ChevronDown,
  Tag,
  Layers,
  Sparkles,
  Filter,
} from "lucide-react";
import {
  AttributeFieldDraft,
  AttributeSetDraft,
  AttributeSetRecord,
} from "@/redux/slices/attributes/attributeSlices";
import { ImportModal } from "@/components/mongoDb/ImportModal";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  createAttributeSet,
  deleteAttributeSet,
  fetchAttributes,
  updateAttributeSet,
} from "@/redux/slices/attributes/attributesThunk";

function createEmptyField(): AttributeFieldDraft {
  return {
    key: "",
    label: "",
    type: "select",
    options: "",
    enabled: true,
  };
}

function createEmptyDraft(): AttributeSetDraft {
  return {
    name: "",
    key: "",
    appliesTo: "product",
    contexts: "",
    description: "",
    attributes: [createEmptyField()],
  };
}

function fromRecord(record: AttributeSetRecord): AttributeSetDraft {
  return {
    name: record.name || "",
    key: record.key || "",
    appliesTo: record.appliesTo || "product",
    contexts: Array.isArray(record.contexts) ? record.contexts.join(", ") : "",
    description: record.description || "",
    attributes:
      Array.isArray(record.attributes) && record.attributes.length > 0
        ? record.attributes.map((attribute) => ({
            key: attribute.key || "",
            label: attribute.label || "",
            type: attribute.type || "select",
            options: Array.isArray(attribute.options)
              ? attribute.options.join(", ")
              : "",
            enabled: attribute.enabled !== false,
          }))
        : [createEmptyField()],
  };
}

function toPayload(draft: AttributeSetDraft) {
  return {
    name: draft.name.trim(),
    key: draft.key.trim(),
    appliesTo: draft.appliesTo,
    contexts: draft.contexts
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    description: draft.description.trim(),
    attributes: draft.attributes
      .map((attribute) => ({
        key: attribute.key.trim(),
        label: attribute.label.trim(),
        type: attribute.type || "select",
        options: attribute.options
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        enabled: attribute.enabled,
      }))
      .filter((attribute) => attribute.key && attribute.label),
  };
}

export default function EcommerceAttributesPage() {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<AttributeSetDraft>(createEmptyDraft);
  const [showTagsView, setShowTagsView] = useState(false);
  const [tagsRecord, setTagsRecord] = useState<AttributeSetRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const dispatch = useDispatch<AppDispatch>();
  const { allattributes: records, attributeLoading: loading } = useSelector(
    (state: RootState) => state.attributes,
  );

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    let result = records;

    if (filterType !== "all") {
      result = result.filter((record) => {
        if (filterType === "system") return record.isSystem;
        if (filterType === "custom") return !record.isSystem;
        return record.appliesTo === filterType;
      });
    }

    if (!keyword) return result;
    return result.filter((record) => {
      const haystack = [
        record.name,
        record.key,
        record.appliesTo,
        record.businessType,
        ...(Array.isArray(record.contexts) ? record.contexts : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [records, search, filterType]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const resetForm = () => {
    setForm(createEmptyDraft());
    setEditingId(null);
    setShowForm(false);
  };

  const handleClone = async (record: AttributeSetRecord) => {
    setSaving(true);
    const draft = fromRecord(record);
    draft.name = `${draft.name} (Copy)`;
    draft.key = `${draft.key}-copy`;
    const payload = toPayload(draft);

    const resultAction = await dispatch(createAttributeSet(payload));
    setSaving(false);

    if (createAttributeSet.fulfilled.match(resultAction)) {
      showToast("Attribute set cloned successfully!");
      dispatch(fetchAttributes());
    } else {
      showToast(
        (resultAction.payload as any)?.message ||
          "Failed to clone attribute set.",
      );
    }
  };

  const handleEdit = (record: AttributeSetRecord) => {
    setForm(fromRecord(record));
    setEditingId(record._id);
    setShowForm(true);
  };

  const handleToggleAttribute = async (
    record: AttributeSetRecord,
    attrKey: string,
  ) => {
    const updatedAttributes = (record.attributes || []).map((attr) => {
      if (attr.key === attrKey) {
        return { ...attr, enabled: attr.enabled === false };
      }
      return attr;
    });

    const resultAction = await dispatch(
      updateAttributeSet({
        id: record._id,
        payload: { attributes: updatedAttributes },
      }),
    );

    if (updateAttributeSet.fulfilled.match(resultAction)) {
      if (tagsRecord?._id === record._id) {
        setTagsRecord({ ...record, attributes: updatedAttributes as any });
      }
      showToast("Attribute toggled successfully!");
      dispatch(fetchAttributes());
    } else {
      showToast("Failed to toggle attribute.");
    }
  };

  const handleSave = async () => {
    const payload = toPayload(form);
    if (!payload.name || payload.attributes.length === 0) {
      showToast("Name and at least one attribute are required.");
      return;
    }

    setSaving(true);
    let resultAction;
    if (editingId) {
      resultAction = await dispatch(
        updateAttributeSet({ id: editingId, payload }),
      );
    } else {
      resultAction = await dispatch(createAttributeSet(payload));
    }
    setSaving(false);

    if (
      createAttributeSet.fulfilled.match(resultAction) ||
      updateAttributeSet.fulfilled.match(resultAction)
    ) {
      showToast(
        editingId ? "Attribute set updated!" : "Attribute set created!",
      );
      resetForm();
      // dispatch(fetchAttributes());
    } else {
      showToast(
        (resultAction.payload as any)?.message ||
          "Failed to save attribute set.",
      );
    }
  };

  const handleDelete = async (record: AttributeSetRecord) => {
    if (!confirm(`Delete attribute set "${record.name}"?`)) return;
    const resultAction = await dispatch(deleteAttributeSet(record._id));
    if (deleteAttributeSet.fulfilled.match(resultAction)) {
      showToast("Attribute set deleted!");
    } else {
      showToast(
        (resultAction.payload as any)?.message ||
          "Failed to delete attribute set.",
      );
    }
  };

  const updateAttribute = (
    index: number,
    patch: Partial<AttributeFieldDraft>,
  ) => {
    console.log(index, patch);
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attribute, attrIndex) =>
        attrIndex === index ? { ...attribute, ...patch } : attribute,
      ),
    }));
  };

  const removeAttribute = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, attrIndex) => attrIndex !== index),
    }));
  };

  const stats = useMemo(() => {
    const total = records.length;
    const systemSets = records.filter((r) => r.isSystem).length;
    const totalAttributes = records.reduce(
      (sum, r) => sum + (r.attributes?.length || 0),
      0,
    );
    return { total, systemSets, totalAttributes };
  }, [records]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Sparkles size={16} className="text-slate-900" />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {toast}
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-slate-50 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-slate-50 blur-3xl"></div>

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-200">
                <Layers size={32} className="text-white" />
              </div>
              <div>
                <h1 className="mb-2 text-4xl font-black tracking-tight text-slate-900">
                  Attribute Sets
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  Create and manage business-calibrated attribute sets for
                  products and variants. Define custom fields, enable/disable
                  attributes, and organize your catalog efficiently.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
              >
                <Upload
                  size={18}
                  className="transition-transform group-hover:scale-110"
                />
                Import JSON
              </button>
              <button
                onClick={() => {
                  setForm(createEmptyDraft());
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-105"
              >
                <Plus
                  size={18}
                  className="transition-transform group-hover:rotate-90"
                />
                New Attribute Set
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Tag size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.total}
                  </p>
                  <p className="text-xs text-slate-500">Total Sets</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Sparkles size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.systemSets}
                  </p>
                  <p className="text-xs text-slate-500">System Sets</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <ListFilter size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalAttributes}
                  </p>
                  <p className="text-xs text-slate-500">Total Attributes</p>
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, key, context, or business type..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-100"
            />
          </div>

          <div className="relative">
            <Filter
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-700 shadow-sm transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-100"
            >
              <option value="all">All Types</option>
              <option value="system">System Sets</option>
              <option value="custom">Custom Sets</option>
              <option value="product">Product Only</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <section className="animate-in slide-in-from-top-5 fade-in duration-300 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-50 p-2">
                  <Save size={20} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingId
                      ? "Edit Attribute Set"
                      : "Create New Attribute Set"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editingId
                      ? "Update the details below"
                      : "Fill in the details to create a new set"}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Set Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    placeholder="e.g., Room Plan"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Unique Key
                  </label>
                  <input
                    value={form.key}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, key: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    placeholder="e.g., room-plan"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Applies To
                  </label>
                  <select
                    value={form.appliesTo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        appliesTo: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  >
                    <option value="product">Product</option>
                    <option value="variant">Variant</option>
                  </select>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Contexts (comma separated)
                  </label>
                  <input
                    value={form.contexts}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        contexts: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    placeholder="e.g., travel-package, hospitality"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </label>
                  <input
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    placeholder="Optional guidance for this set"
                  />
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Attributes
                    </h3>
                    <p className="text-xs text-slate-500">
                      Define the fields for this set
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        attributes: [...prev.attributes, createEmptyField()],
                      }))
                    }
                    className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Plus
                      size={14}
                      className="transition-transform group-hover:rotate-90"
                    />
                    Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {form.attributes.map((attribute, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 shadow-sm"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <input
                          value={attribute.key}
                          onChange={(event) =>
                            updateAttribute(index, { key: event.target.value })
                          }
                          placeholder="key"
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 md:col-span-2"
                        />
                        <input
                          value={attribute.label}
                          onChange={(event) =>
                            updateAttribute(index, {
                              label: event.target.value,
                            })
                          }
                          placeholder="label"
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 md:col-span-3"
                        />
                        <select
                          value={attribute.type}
                          onChange={(event) =>
                            updateAttribute(index, { type: event.target.value })
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 md:col-span-2"
                        >
                          <option value="select">Select</option>
                          <option value="multiselect">Multi Select</option>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                        </select>
                        <input
                          value={attribute.options}
                          onChange={(event) =>
                            updateAttribute(index, {
                              options: event.target.value,
                            })
                          }
                          placeholder="option1, option2, option3"
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 md:col-span-4"
                        />
                        <button
                          onClick={() => removeAttribute(index)}
                          className="flex items-center justify-center rounded-lg border border-rose-100 bg-rose-50 px-2 py-2 text-rose-600 transition-all hover:bg-rose-100 md:col-span-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save
                    size={16}
                    className="transition-transform group-hover:scale-110"
                  />
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Set"
                      : "Create Set"}
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

        {/* Attribute Sets Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 shadow-sm">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-slate-900"></div>
            <p className="text-sm font-medium text-slate-500">
              Loading attribute sets...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <ListFilter size={32} className="text-slate-300" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-800">
              No attribute sets found
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {search || filterType !== "all"
                ? "Try adjusting your search or filter"
                : "Get started by creating your first attribute set"}
            </p>
            {!search && filterType === "all" && (
              <button
                onClick={() => {
                  setForm(createEmptyDraft());
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white shadow-lg shadow-slate-200"
              >
                <Plus size={16} />
                Create Attribute Set
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map((record, idx) => (
              <article
                key={record._id}
                className="group animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-slate-950">
                      {record.name}
                    </h3>
                    <p className="mb-2 font-mono text-xs text-slate-400">
                      {record.key || "no-key"}
                    </p>
                    {record.businessType && (
                      <span className="inline-block rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                        {record.businessType}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleClone(record)}
                      title="Clone to new set"
                      className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setTagsRecord(record);
                        setShowTagsView(true);
                      }}
                      title="Manage attributes"
                      className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Settings2 size={14} />
                    </button>
                    <button
                      onClick={() => handleEdit(record)}
                      className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(record)}
                      className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Contexts & Tags */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {(record.contexts || []).map((context) => (
                    <span
                      key={context}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      {context}
                    </span>
                  ))}
                  {record.isSystem && (
                    <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600">
                      System
                    </span>
                  )}
                </div>

                {/* Attributes List */}
                <div className="space-y-2">
                  {(record.attributes || [])
                    .slice(0, 5)
                    .map((attribute, index) => (
                      <div
                        key={`${record._id}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                      >
                        <span className="text-xs font-medium text-slate-700">
                          {attribute.label || attribute.key}
                        </span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400 shadow-sm">
                          {attribute.type || "select"}
                        </span>
                      </div>
                    ))}
                  {(record.attributes || []).length > 5 && (
                    <p className="pl-3 pt-1 text-xs text-slate-500">
                      + {(record.attributes || []).length - 5} more fields
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Attribute Toggle Modal */}
      {showTagsView && tagsRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-8 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
                  <Settings2 size={24} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">
                    Manage Attributes
                  </h2>
                  <p className="text-sm text-slate-500">
                    Enable or disable specific attributes for{" "}
                    <span className="font-bold text-slate-900">
                      {tagsRecord.name}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTagsView(false)}
                className="rounded-xl bg-slate-50 p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Attributes Grid */}
            <div className="mb-8 flex flex-wrap gap-3">
              {(tagsRecord.attributes || []).map((attr) => {
                const isEnabled = attr.enabled !== false;
                return (
                  <button
                    key={attr.key}
                    onClick={() => handleToggleAttribute(tagsRecord, attr.key!)}
                    className={`group flex items-center gap-2.5 rounded-xl border-2 px-5 py-3 text-sm font-bold transition-all ${
                      isEnabled
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                        : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isEnabled ? (
                      <CheckCircle2
                        size={18}
                        className="transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <Circle
                        size={18}
                        className="transition-transform group-hover:scale-110"
                      />
                    )}
                    <span className={!isEnabled ? "line-through" : ""}>
                      {attr.label || attr.key}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTagsView(false)}
                className="rounded-xl bg-slate-900 px-8 py-3 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal Placeholder */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Import JSON</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Import functionality would go here...
            </p>
          </div>
        </div>
      )}
      <ImportModal
        type="attribute"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
