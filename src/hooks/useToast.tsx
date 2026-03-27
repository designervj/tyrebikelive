import { useState } from "react";

export interface Toast {
  message: string;
  type: "success" | "error" | "info";
}

export const useToast = () => {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
};
