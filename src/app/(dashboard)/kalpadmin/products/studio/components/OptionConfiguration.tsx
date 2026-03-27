import React from "react";
import { Layers, Sparkles, Plus } from "lucide-react";
import { SectionCard } from "./Common";
import { ProductOption } from "../utils";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useSearchParams } from "next/navigation";

interface OptionConfigurationProps {
  allattributes: any[];
  attributeSetIds: string[];
  options: ProductOption[];
  onToggleAttributeSet: (id: string) => void;
  onOptionChange: (idx: number, opt: ProductOption) => void;
  onAddOptionValue: (idx: number) => void;
  onRegenerateVariants: () => void;
}

export function OptionConfiguration({
  allattributes,
  attributeSetIds,
  options,
  onToggleAttributeSet,
  onOptionChange,
  onAddOptionValue,
  onRegenerateVariants,
}: OptionConfigurationProps) {
  const { allProducts } = useSelector((state: RootState) => state.products);
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const prevProduct = allProducts.find((item) => item._id === editId);

  return (
    <SectionCard
      icon={<Layers className="text-orange-500" size={16} />}
      title="Option Configuration"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {allattributes.map((set) => {
            const active = attributeSetIds.includes(set.key || set._id);
            return (
              <button
                key={set._id}
                onClick={() => onToggleAttributeSet(set.key || set._id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                  active
                    ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {set.name}
              </button>
            );
          })}
        </div>

        {options.length > 0 && (
          <div className="space-y-6">
            {(() => {
              const groups: Record<
                string,
                {
                  name: string;
                  items: { opt: ProductOption; originalIdx: number }[];
                }
              > = {};

              options.forEach((opt, originalIdx) => {
                const setId = opt.attributeSetId || "other";
                if (!groups[setId]) {
                  const attributeSet = allattributes.find(
                    (s) => (s.key || s._id) === setId,
                  );
                  groups[setId] = {
                    name: attributeSet?.name || "Other Options",
                    items: [],
                  };
                }
                groups[setId].items.push({ opt, originalIdx });
              });

              return Object.entries(groups).map(([setId, group]) => (
                <div key={setId} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white px-2">
                      {group.name}
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  <div className="space-y-3">
                    {group.items.map(({ opt, originalIdx }) => (
                      <div
                        key={originalIdx}
                        className="p-3 bg-slate-50/30 rounded-xl border border-slate-100 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-black text-slate-700 text-[10px] uppercase tracking-wider">
                            {opt.label}
                          </div>
                          <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.useForVariants}
                              onChange={(e) => {
                                onOptionChange(originalIdx, {
                                  ...opt,
                                  useForVariants: e.target.checked,
                                });
                              }}
                              className="w-3 h-3 rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            Variations Group
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {opt.values.map((val) => {
                            const selected = opt.selectedValues.includes(val);
                            const prevSelected = prevProduct
                              ? prevProduct?.options
                                  ?.find((item) => item.label === opt.label)
                                  ?.selectedValues.includes(val)
                              : false;

                            return (
                              <button
                                key={val}
                                onClick={() => {
                                  const exists =
                                    opt.selectedValues.includes(val);
                                  onOptionChange(originalIdx, {
                                    ...opt,
                                    selectedValues: exists
                                      ? opt.selectedValues.filter(
                                          (v) => v !== val,
                                        )
                                      : [...opt.selectedValues, val],
                                  });
                                }}
                                disabled={prevSelected}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                                  selected
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                } border`}
                              >
                                {val}
                              </button>
                            );
                          })}
                          <div className="flex items-center gap-1">
                            <input
                              value={opt.draftValue}
                              onChange={(e) => {
                                onOptionChange(originalIdx, {
                                  ...opt,
                                  draftValue: e.target.value,
                                });
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                onAddOptionValue(originalIdx)
                              }
                              placeholder="New Value"
                              className="w-20 px-2 py-0.5 text-[9px] border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                            />
                            <button
                              onClick={() => onAddOptionValue(originalIdx)}
                              className="p-1 bg-slate-100 rounded-md text-slate-500 hover:bg-slate-200"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}

            <button
              onClick={onRegenerateVariants}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all"
            >
              <Sparkles size={14} />
              Regenerate Matrix
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
