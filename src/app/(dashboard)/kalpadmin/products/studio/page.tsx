"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Eye, Package, Save, X } from "lucide-react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/components/AdminAuthProvider";
import { canRoleMutateUi } from "@/lib/role-scope";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchCategories } from "@/redux/slices/categories/categoriesThunk";
import { fetchAttributes } from "@/redux/slices/attributes/attributesThunk";
import {
  setProductFormField,
  resetProductForm,
  setPricingField,
  setCurrentProduct,
} from "@/redux/slices/products/productsSlices";
import {
  fetchProductById,
  saveProduct,
} from "@/redux/slices/products/productsThunk";

import {
  VariantRow,
  ProductOption,
  ProductGalleryItem,
  RelatedProduct,
  slugify,
  sanitizeKey,
  composeVariantKey,
  buildCombinationTitle,
  parseGallery,
  buildVariantCombinations,
  readTenantKeyFromCookie,
  readFileAsDataUrl,
  generateSKUWithBaseSKU,
} from "./utils";

import { GeneralInformation } from "./components/GeneralInformation";
import { PricingInventory } from "./components/PricingInventory";
import { VisualMedia } from "./components/VisualMedia";
import { OptionConfiguration } from "./components/OptionConfiguration";
import { VariantMatrix } from "./components/VariantMatrix";
import { PublicationSidebar } from "./components/PublicationSidebar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "./components/Toast";

function ProductStudioContent() {
  const { currentProfile } = useAuth();
  const canMutate = canRoleMutateUi(currentProfile);
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const editId = searchParams.get("id");
  const isEditing = Boolean(editId);

  // Redux Selectors
  const { allCategories, categoryLoading } = useSelector(
    (state: RootState) => state.categories,
  );
  const { allattributes, attributeLoading } = useSelector(
    (state: RootState) => state.attributes,
  );
  
  const {
    currentProduct: form,
    loading: productLoading,
    saving,
    allProducts,
  } = useSelector((state: RootState) => state.products);

  // Local State (remaining non-form state)
  const [loading, setLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<
    Array<{ _id: string; filename?: string; url?: string }>
  >([]);
  const [sourceEnabled, setSourceEnabled] = useState(false);
  const [galleryUrlDraft, setGalleryUrlDraft] = useState("");
  const [productSlug, setProductSlug] = useState("");

  const relatedProductCandidates = useMemo(
    () => allProducts.filter((item) => item._id !== editId),
    [allProducts, editId],
  );

  const { toast, showToast } = useToast();

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      try {
        // const [tenantRes, productsRes, mediaRes] = await Promise.all([
        //   fetch("/api/settings/tenant"),
        //   fetch("/api/ecommerce/products"),
        //   fetch("/api/media?type=image"),
        // ]);

        // const [tenantData, productsData, mediaData] = await Promise.all([
        //   tenantRes.json(),
        //   productsRes.json(),
        //   mediaRes.json(),
        // ]);
        // setMediaItems(Array.isArray(mediaData) ? mediaData : []);

        // const enabledModules = Array.isArray(tenantData?.enabledModules)
        //   ? tenantData.enabledModules
        //   : [];
        // const featureFlags = tenantData?.featureFlags || {};
        // setSourceEnabled(
        //   enabledModules.includes("source") &&
        //     featureFlags.sourceModuleEnabled !== false,
        // );

        if (isEditing && editId && allProducts.length > 0) {
          const singleProduct = allProducts.find((item) => item._id === editId);
          if (singleProduct) {
            dispatch(setCurrentProduct(singleProduct));
          }
        } else {
          dispatch(resetProductForm());
          setProductSlug("");
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [editId, allProducts]);

  const handleSave = async () => {
    if (!canMutate || !form) return;
    if (!form.name.trim() || !form.sku.trim())
      return showToast("Name and SKU required", "error");

    const payload = {
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      slug: productSlug.trim(),
      price: Number(form.pricing.price || 0),
      pricing: {
        ...form.pricing,
        price: Number(form.pricing.price || 0),
        compareAtPrice: Number(form.pricing.compareAtPrice || 0),
        costPerItem: Number(form.pricing.costPerItem || 0),
      },
      variants: form.variants.map((v) => ({
        ...v,
        price: Number(v.price || form.pricing.price || 0),
        stock: Number(v.stock || 0),
      })),
    };

    try {
      const action: any = await dispatch(
        saveProduct({ id: editId || undefined, payload }),
      );
      if (saveProduct.fulfilled.match(action)) {
        showToast(isEditing ? "Updated successfully" : "Created successfully");
        // router.push("/kalpadmin/products");
      } else {
        showToast(action.payload || "Failed to save", "error");
      }
    } catch (e) {
      showToast("An error occurred", "error");
    }
  };

  const regenerateVariants = () => {
    if (!form) return;
    const combos = buildVariantCombinations(form.options);
    const currentMap = form.variants.map((v) => [
      v._id,
      Object.values(v.optionValues).join("-"),
    ]);
    const nextVariants: VariantRow[] = combos.map((combo, index) => {
      const keystring = Object.values(combo).join("-");
      const findKey = currentMap.find((item) => item[1] === keystring);
      const existing = form.variants.find((v) => v._id === findKey?.[0]);

      return {
        _id: existing?._id || `v-${index}`,
        title:
          existing?.title ||
          buildCombinationTitle(combo) ||
          `Variant ${index + 1}`,
        optionValues: combo,
        sku: existing?.sku || generateSKUWithBaseSKU(form.sku, combo),
        price: existing?.price || form.pricing.price,
        stock: existing?.stock || "0",
        productId: existing?.productId || "",
        status: existing?.status || "active",
        createdAt: existing?.createdAt || "",
      };
    });

    dispatch(setProductFormField({ field: "variants", value: nextVariants }));
    showToast(`Generated ${nextVariants.length} variants`);
  };

  const toggleAttributeSet = (id: string) => {
    if (!form) return;
    const isRemoving = form.attributeSetIds.includes(id);
    const nextIds = isRemoving
      ? form.attributeSetIds.filter((i) => i !== id)
      : [...form.attributeSetIds, id];

    const nextOptions = isRemoving
      ? form.options.filter((o) => o.attributeSetId !== id)
      : [
          ...form.options,
          ...(
            allattributes.find((s) => (s.key || s._id) === id)?.attributes || []
          )
            .filter((a) => a.enabled !== false)
            .map((a) => ({
              key: sanitizeKey(a.key || a.label || ""),
              label: a.label || a.key || "Option",
              values: a.options || [],
              selectedValues: [],
              useForVariants: false,
              draftValue: "",
              attributeSetId: id,
            })),
        ];

    dispatch(setProductFormField({ field: "attributeSetIds", value: nextIds }));
    dispatch(setProductFormField({ field: "options", value: nextOptions }));
    dispatch(setProductFormField({ field: "variants", value: [] }));
  };

  const toggleCategory = (slug: string) => {
    if (!form) return;
    const exists = form.categoryIds.includes(slug);
    const nextIds = exists
      ? form.categoryIds.filter((i) => i !== slug)
      : [...form.categoryIds, slug];

    dispatch(setProductFormField({ field: "categoryIds", value: nextIds }));

    if (exists && form.primaryCategoryId === slug) {
      dispatch(setProductFormField({ field: "primaryCategoryId", value: "" }));
    } else if (!exists && nextIds.length === 1) {
      dispatch(
        setProductFormField({ field: "primaryCategoryId", value: slug }),
      );
    }
  };

  const addOptionValue = (idx: number) => {
    if (!form) return;
    const opt = form.options[idx];
    if (!opt.draftValue.trim()) return;
    const next = [...form.options];
    next[idx] = {
      ...opt,
      values: [...opt.values, opt.draftValue.trim()],
      draftValue: "",
    };
    dispatch(setProductFormField({ field: "options", value: next }));
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || !form) return;
    let nextGallery = [...form.gallery];
    let primaryId = form.primaryImageId;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const url = await readFileAsDataUrl(file);
      const id = `gal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      nextGallery.push({ id, url, alt: file.name, order: nextGallery.length });
      if (!primaryId) primaryId = id;
    }

    dispatch(setProductFormField({ field: "gallery", value: nextGallery }));
    dispatch(
      setProductFormField({ field: "primaryImageId", value: primaryId }),
    );
  };

  if (loading || productLoading || !form)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-4 animate-in fade-in duration-500">
      {/* Toast */}
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/kalpadmin/products"
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div
              className="text-lg font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "inherit" }}
            >
              {isEditing ? "Edit Product" : "New Creation"}
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Package size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {form.sku || "Generating Identity"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              window.open(
                `/product/${readTenantKeyFromCookie()}--${productSlug}`,
                "_blank",
              )
            }
            disabled={!productSlug}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canMutate}
            className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-60"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
            ) : (
              <Save size={14} />
            )}
            <span>{isEditing ? "Update" : "Launch"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-4">
          <GeneralInformation
            name={form.name}
            sku={form.sku}
            slug={productSlug}
            description={form.description}
            onFormChange={(field, value) =>
              dispatch(setProductFormField({ field: field as any, value }))
            }
            onSlugChange={setProductSlug}
          />

          <PricingInventory
            pricing={form.pricing}
            onPricingChange={(field, value) =>
              dispatch(setPricingField({ field: field as any, value }))
            }
          />

          <VisualMedia
            gallery={form.gallery}
            primaryImageId={form.primaryImageId}
            galleryUrlDraft={galleryUrlDraft}
            onGalleryChange={(gallery) =>
              dispatch(
                setProductFormField({ field: "gallery", value: gallery }),
              )
            }
            onPrimaryImageChange={(id) =>
              dispatch(
                setProductFormField({ field: "primaryImageId", value: id }),
              )
            }
            onGalleryUrlDraftChange={setGalleryUrlDraft}
            onAddGalleryItem={(item) => {
              dispatch(
                setProductFormField({
                  field: "gallery",
                  value: [...form.gallery, item],
                }),
              );
              if (!form.primaryImageId) {
                dispatch(
                  setProductFormField({
                    field: "primaryImageId",
                    value: item.id,
                  }),
                );
              }
            }}
          />

          <OptionConfiguration
            allattributes={allattributes}
            attributeSetIds={form.attributeSetIds}
            options={form.options}
            onToggleAttributeSet={toggleAttributeSet}
            onOptionChange={(idx, opt) => {
              const next = [...form.options];
              next[idx] = opt;
              dispatch(setProductFormField({ field: "options", value: next }));
            }}
            onAddOptionValue={addOptionValue}
            onRegenerateVariants={regenerateVariants}
          />

          <VariantMatrix
            variants={form.variants}
            onVariantsChange={(variants) =>
              dispatch(
                setProductFormField({ field: "variants", value: variants }),
              )
            }
          />
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4">
          <PublicationSidebar
            status={form.status}
            templateKey={form.templateKey}
            allCategories={allCategories}
            categoryIds={form.categoryIds}
            primaryCategoryId={form.primaryCategoryId}
            relatedProductCandidates={relatedProductCandidates}
            relatedProductIds={form.relatedProductIds}
            onFormChange={(field, value) =>
              dispatch(setProductFormField({ field: field as any, value }))
            }
            onToggleCategory={toggleCategory}
            onToggleRelatedProduct={(id) =>
              dispatch(
                setProductFormField({
                  field: "relatedProductIds",
                  value: form.relatedProductIds.includes(id)
                    ? form.relatedProductIds.filter((rid) => rid !== id)
                    : [...form.relatedProductIds, id],
                }),
              )
            }
          />
        </div>
      </div>

      <style jsx global>{`
        .compact-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .compact-input:focus {
          outline: none;
          border-color: #94a3b8;
          background: #f8fafc;
          box-shadow: 0 0 0 3px rgba(226, 232, 240, 0.4);
        }
        .compact-input::placeholder {
          color: #cbd5e1;
          font-weight: 400;
          font-size: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

export default function ProductStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        </div>
      }
    >
      <ProductStudioContent />
    </Suspense>
  );
}
