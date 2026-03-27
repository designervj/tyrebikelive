import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createAttributeSet,
  deleteAttributeSet,
  fetchAttributes,
  updateAttributeSet,
} from "./attributesThunk";

export type AttributeFieldDraft = {
  key: string;
  label: string;
  type: string;
  options: string;
  enabled: boolean;
};

export type AttributeSetDraft = {
  name: string;
  key: string;
  appliesTo: string;
  contexts: string;
  description: string;
  attributes: AttributeFieldDraft[];
};

export type AttributeSetRecord = {
  _id: string;
  name: string;
  key?: string;
  appliesTo?: string;
  contexts?: string[];
  description?: string;
  attributes?: Array<{
    key?: string;
    label?: string;
    type?: string;
    options?: string[];
    enabled?: boolean;
  }>;
  isSystem?: boolean;
  businessType?: string;
};

type AttributeState = {
  allattributes: AttributeSetRecord[];
  currentAttribute: AttributeSetRecord | null;
  attributeLoading: boolean;
  attributeError: string | null;
  hasAttributesFetched: boolean;
};

const initialState: AttributeState = {
  allattributes: [],
  currentAttribute: null,
  attributeLoading: false,
  attributeError: null,
  hasAttributesFetched: false,
};

const counterSlice = createSlice({
  name: "attributes",
  initialState,
  reducers: {
    setAllAttributes: (state, action: PayloadAction<AttributeSetRecord[]>) => {
      state.allattributes = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.attributeLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.attributeError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttributes.pending, (state) => {
        state.attributeLoading = true;
        state.attributeError = null;
        state.hasAttributesFetched = false;
      })
      .addCase(fetchAttributes.fulfilled, (state, action) => {
        state.attributeLoading = false;
        state.allattributes = action.payload.data;
        state.hasAttributesFetched = true;
      })
      .addCase(fetchAttributes.rejected, (state, action) => {
        state.attributeLoading = false;
        state.attributeError =
          action.payload?.message || "Failed to fetch attributes";
        state.hasAttributesFetched = true;
      })
      // Create
      .addCase(createAttributeSet.fulfilled, (state, action) => {
        state.attributeLoading = false;
        const data = action.payload.data;
        state.allattributes = [data, ...state.allattributes];
      })
      .addCase(createAttributeSet.rejected, (state, action) => {
        state.attributeError = action.payload?.message || "Failed to create";
      })
      // Update
      .addCase(updateAttributeSet.fulfilled, (state, action) => {
        state.attributeLoading = false;
        const data = action.payload.data;
        state.allattributes = state.allattributes.map((attr) =>
          attr._id === data._id ? data : attr,
        );
      })
      .addCase(updateAttributeSet.rejected, (state, action) => {
        state.attributeError = action.payload?.message || "Failed to update";
      })
      // Delete
      .addCase(deleteAttributeSet.fulfilled, (state, action) => {
        state.attributeLoading = false;
        state.allattributes = state.allattributes.filter(
          (attr) => attr._id !== action.payload.data,
        );
      })
      .addCase(deleteAttributeSet.rejected, (state, action) => {
        state.attributeError = action.payload?.message || "Failed to delete";
      });
  },
});

export const { setAllAttributes, setLoading, setError } = counterSlice.actions;

export default counterSlice.reducer;
