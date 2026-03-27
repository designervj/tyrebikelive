import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "./categoriesThunk";

export type CategoryType = "product" | "portfolio" | "blog";

export type CategoryRecord = {
  _id: string;
  name: string;
  slug: string;
  type: CategoryType;
  parentId?: string | null;
  description?: string;
  templateKey?: string;
  page?: {
    title?: string;
    content?: string;
    bannerImage?: string;
    gallery?: Array<{ url: string; alt?: string; order?: number }>;
    templateKey?: string;
    status?: "draft" | "published" | "archived";
    seo?: {
      metaTitle?: string;
      metaDescription?: string;
    };
  };
  entityCount?: number;
  entityCounts?: {
    product?: number;
    blog?: number;
    portfolio?: number;
    total?: number;
  };
};

type CategoryState = {
  allCategories: CategoryRecord[];
  categoryLoading: boolean;
  categoryError: string | null;
  hasCategoriesFetched: boolean;
};

const initialState: CategoryState = {
  allCategories: [],
  categoryLoading: false,
  categoryError: null,
  hasCategoriesFetched: false,
};

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setAllCategories: (state, action: PayloadAction<CategoryRecord[]>) => {
      state.allCategories = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.categoryLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.categoryError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.categoryLoading = true;
        state.categoryError = null;
        state.hasCategoriesFetched = false;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoryLoading = false;
        state.allCategories = action.payload;
        state.hasCategoriesFetched = true;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoryLoading = false;
        state.hasCategoriesFetched = true;
        state.categoryError =
          action.payload?.message || "Failed to fetch categories";
      })
      // Create
      .addCase(createCategory.pending, (state) => {
        state.categoryLoading = true;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categoryLoading = false;
        state.allCategories = [action.payload, ...state.allCategories];
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.categoryLoading = false;
        state.categoryError =
          action.payload?.message || "Failed to create category";
      })
      // Update
      .addCase(updateCategory.pending, (state) => {
        state.categoryLoading = true;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.categoryLoading = false;
        state.allCategories = state.allCategories.map((cat) =>
          cat._id === action.payload._id ? action.payload : cat,
        );
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.categoryLoading = false;
        state.categoryError =
          action.payload?.message || "Failed to update category";
      })
      // Delete
      .addCase(deleteCategory.pending, (state) => {
        state.categoryLoading = true;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categoryLoading = false;
        state.allCategories = state.allCategories.filter(
          (cat) => cat._id !== action.payload,
        );
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.categoryLoading = false;
        state.categoryError =
          action.payload?.message || "Failed to delete category";
      });
  },
});

export const { setAllCategories, setLoading, setError } = categorySlice.actions;

export default categorySlice.reducer;
