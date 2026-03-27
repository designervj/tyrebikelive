"use client";

import { useAuth } from "@/components/AdminAuthProvider";
import { fetchCategories } from "@/redux/slices/categories/categoriesThunk";
import { AppDispatch, RootState } from "@/redux/store";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export default function GetAllCategories() {
  const { allCategories, categoryLoading, hasCategoriesFetched } = useSelector(
    (state: RootState) => state.categories,
  );

  const dispatch = useDispatch<AppDispatch>();

  const user = useAuth();

  useEffect(() => {
    if (!user) return;

    if (!hasCategoriesFetched && !categoryLoading) {
      dispatch(fetchCategories());
    }
  }, [user, hasCategoriesFetched, categoryLoading]);

  return null;
}
