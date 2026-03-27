"use client";

import { useAuth } from "@/components/AdminAuthProvider";
import { fetchAttributes } from "@/redux/slices/attributes/attributesThunk";
import { AppDispatch, RootState } from "@/redux/store";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export default function GetAllAttributes() {
  const { attributeLoading, hasAttributesFetched } = useSelector(
    (state: RootState) => state.attributes,
  );

  const dispatch = useDispatch<AppDispatch>();

  const user = useAuth();

  useEffect(() => {
    if (!user) return;

    if (!hasAttributesFetched && !attributeLoading) {
      dispatch(fetchAttributes());
    }
  }, [user, hasAttributesFetched, attributeLoading]);

  return null;
}
