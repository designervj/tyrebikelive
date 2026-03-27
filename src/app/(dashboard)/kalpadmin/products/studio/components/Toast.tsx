import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Toast as ToastType } from "@/hooks/useToast";

export const Toast = ({ toast }: { toast: ToastType | null }) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border bg-white border-slate-200 text-slate-900"
        >
          {toast.type === "success" && (
            <Check className="text-emerald-500" size={16} />
          )}
          {toast.type === "error" && <X className="text-rose-500" size={16} />}
          <span className="text-xs font-bold">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
