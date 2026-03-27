"use client";

import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveProduct } from "@/redux/slices/products/productsThunk";
import { createCategory } from "@/redux/slices/categories/categoriesThunk";
import { createAttributeSet } from "@/redux/slices/attributes/attributesThunk";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/app/(dashboard)/kalpadmin/products/studio/components/Toast";
import {
  Upload,
  Download,
  FileJson,
  Check,
  X,
  AlertCircle,
  FileCheck,
  CloudUpload,
  Info,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportModalProps {
  type: "product" | "category" | "attribute";
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_TEMPLATES = {
  product: [
    {
      name: "Sample Product",
      sku: "SP-001",
      slug: "sample-product",
      description: "This is a sample product.",
      status: "active",
      type: "physical",
      pricing: {
        price: "100",
        compareAtPrice: "120",
        chargeTax: true,
        trackQuantity: true,
      },
    },
  ],
  category: [
    {
      name: "Sample Category",
      slug: "sample-category",
      type: "product",
      description: "This is a sample category.",
    },
  ],
  attribute: [
    {
      name: "Sample Attribute Set",
      key: "sample_attribute_set",
      appliesTo: "product",
      description: "This is a sample attribute set.",
      attributes: [
        {
          key: "color",
          label: "Color",
          type: "text",
          options: "",
          enabled: true,
        },
      ],
    },
  ],
};

export const ImportModal: React.FC<ImportModalProps> = ({
  type,
  isOpen,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { toast, showToast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    const jsonString = JSON.stringify(SAMPLE_TEMPLATES[type], null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sample_${type}s.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      showToast("Please upload a valid JSON file.", "error");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setData(json);
        } else {
          setData([json]);
        }
      } catch (err) {
        showToast("Failed to parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleRemoveFile = () => {
    setData([]);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (data.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of data) {
      try {
        if (type === "product") {
          await dispatch(saveProduct({ payload: item })).unwrap();
        } else if (type === "category") {
          await dispatch(createCategory(item)).unwrap();
        } else if (type === "attribute") {
          await dispatch(createAttributeSet(item)).unwrap();
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to import item:`, item, error);
        failCount++;
      }
    }

    setLoading(false);
    showToast(
      `Import complete! ${successCount} items imported, ${failCount} failed.`,
    );
    if (successCount > 0) {
      setTimeout(() => {
        onClose();
        handleRemoveFile();
      }, 500);
    }
  };

  const renderPreviewTable = () => {
    if (data.length === 0) return null;

    const headers = Object.keys(data[0]).filter(
      (k) => typeof data[0][k] !== "object" && typeof data[0][k] !== "function",
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Data Preview</p>
            <span className="text-xs text-slate-500">
              Showing {Math.min(data.length, 5)} of {data.length} items
            </span>
          </div>
        </div>
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 border-b border-slate-200">
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    className="h-9 text-xs font-semibold text-slate-600 px-4 first:pl-6"
                  >
                    {header.charAt(0).toUpperCase() + header.slice(1)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 5).map((row, i) => (
                <TableRow
                  key={i}
                  className="hover:bg-slate-50/50 transition-colors border-slate-100"
                >
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      className="text-xs text-slate-600 px-4 py-3 first:pl-6"
                    >
                      {String(row[header] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    );
  };

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <>
      <Toast toast={toast} />
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-0 rounded-2xl shadow-2xl bg-white gap-0">
          {/* Compact Header */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-6 py-5">
            {/* Subtle background effects */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CloudUpload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Import {typeLabel}s
                  </h2>
                  <p className="text-sm text-white/80 mt-0.5">
                    Upload JSON to bulk update catalog
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white rounded-lg gap-2 h-9 px-4 font-medium"
              >
                <Download className="w-4 h-4" />
                Template
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto">
            {/* Upload Area */}
            {!fileName ? (
              <motion.div
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50/30 py-10 px-6"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 group-hover:from-indigo-200 group-hover:to-purple-200 transition-all mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  JSON files only (max 10MB)
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[350px]">
                      {fileName}
                    </p>
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      {data.length} {data.length === 1 ? "item" : "items"} ready
                      to import
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="rounded-lg hover:bg-red-100 hover:text-red-600 h-9 w-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {renderPreviewTable()}

            {/* Info Section */}
            {!data.length && (
              <div className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <p className="font-medium mb-1">File Requirements:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Must be valid JSON format</li>
                    <li>• Follow the schema from the template</li>
                    <li>
                      • Include all required fields for{" "}
                      {typeLabel.toLowerCase()}s
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border-slate-300 px-5 font-medium text-slate-700 hover:bg-white h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading || data.length === 0}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 shadow-lg shadow-indigo-500/25 gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 h-10"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Importing...
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Import {data.length > 0 && `(${data.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
