import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchProducts,
  fetchProductById,
  saveProduct,
  deleteProduct,
} from "./productsThunk";
import {
  ProductOption,
  ProductGalleryItem,
  RelatedProduct,
  VariantRow,
} from "@/app/(dashboard)/kalpadmin/products/studio/utils";

export interface ProductFormState {
  _id?: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  status: string;
  type: string;
  categoryIds: string[];
  attributeSetIds: string[];
  pricing: {
    price: string;
    compareAtPrice: string;
    costPerItem: string;
    chargeTax: boolean;
    trackQuantity: boolean;
  };
  options: ProductOption[];
  variants: VariantRow[];
  gallery: ProductGalleryItem[];
  primaryImageId: string;
  primaryCategoryId: string;
  relatedProductIds: string[];
  templateKey: string;
  price?: string;
}

interface ProductsState {
  allProducts: ProductFormState[];
  currentProduct: ProductFormState | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hasFetched: boolean;
}

const initialFormState: ProductFormState = {
  name: "",
  sku: "",
  slug: "",
  description: "",
  status: "active",
  type: "physical",
  categoryIds: [],
  attributeSetIds: [],
  pricing: {
    price: "",
    compareAtPrice: "",
    costPerItem: "",
    chargeTax: true,
    trackQuantity: true,
  },
  options: [],
  variants: [],
  gallery: [],
  primaryImageId: "",
  primaryCategoryId: "",
  relatedProductIds: [],
  templateKey: "product-split",
};

const initialState: ProductsState = {
  allProducts: [],
  currentProduct: initialFormState,
  loading: false,
  saving: false,
  error: null,
  hasFetched: false,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProductFormField: (
      state,
      action: PayloadAction<{ field: keyof ProductFormState; value: any }>,
    ) => {
      if (state.currentProduct) {
        (state.currentProduct as any)[action.payload.field] =
          action.payload.value;
      }
    },
    setPricingField: (
      state,
      action: PayloadAction<{
        field: keyof ProductFormState["pricing"];
        value: any;
      }>,
    ) => {
      if (state.currentProduct) {
        (state.currentProduct.pricing as any)[action.payload.field] =
          action.payload.value;
      }
    },
    resetProductForm: (state) => {
      state.currentProduct = initialFormState;
    },
    setProductForm: (state, action: PayloadAction<ProductFormState>) => {
      state.currentProduct = action.payload;
    },
    setCurrentProduct: (state, action: PayloadAction<ProductFormState>) => {
      state.currentProduct = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.hasFetched = false;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.allProducts = action.payload.data;
        state.hasFetched = true;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.hasFetched = true;
      })
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        // Transform API response to ProductFormState if needed
        const p: ProductFormState = action.payload;
        state.currentProduct = {
          _id: p._id,
          name: p.name || "",
          sku: p.sku || "",
          slug: p.slug || "",
          description: p.description || "",
          status: p.status || "active",
          type: p.type || "physical",
          categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds : [],
          attributeSetIds: Array.isArray(p.attributeSetIds)
            ? p.attributeSetIds
            : [],
          pricing: {
            price: String(p.pricing?.price ?? p.price ?? ""),
            compareAtPrice: String(p.pricing?.compareAtPrice ?? ""),
            costPerItem: String(p.pricing?.costPerItem ?? ""),
            chargeTax: p.pricing?.chargeTax !== false,
            trackQuantity: p.pricing?.trackQuantity !== false,
          },
          options: Array.isArray(p.options) ? p.options : [],
          variants: (p.variants || []).map((v: any, i: number) => ({
            _id: v._id || `v-${i}`,
            optionValues: v.optionValues || {},
            sku: v.sku || "",
            price: String(v.price ?? ""),
            stock: String(v.stock ?? ""),
            status: v.status || "active",
            createdAt: v.createdAt || "",
            title: v.title || "",
          })),
          gallery: p.gallery || [],
          primaryImageId: p.primaryImageId || "",
          primaryCategoryId: p.primaryCategoryId || "",
          relatedProductIds: p.relatedProductIds || [],
          templateKey: p.templateKey || "product-split",
        };
      })
      .addCase(saveProduct.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveProduct.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload.id) {
          state.allProducts.push(action.payload.data);
        } else {
          state.allProducts = state.allProducts.map((product) =>
            product._id === action.payload.data._id
              ? action.payload.data
              : product,
          );
        }
      })
      .addCase(saveProduct.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload.id;
        state.allProducts = state.allProducts.map((product) =>
          product._id === id ? { ...product, status: "archived" } : product,
        );
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setProductFormField,
  setPricingField,
  resetProductForm,
  setProductForm,
  setCurrentProduct,
} = productsSlice.actions;
export default productsSlice.reducer;
