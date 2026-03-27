// import React from "react";
// import { Layers, Trash2 } from "lucide-react";
// import { SectionCard } from "./Common";
// import { VariantRow } from "../utils";

// interface VariantMatrixProps {
//   variants: VariantRow[];
//   onVariantsChange: (variants: VariantRow[]) => void;
// }

// export function VariantMatrix({
//   variants,
//   onVariantsChange,
// }: VariantMatrixProps) {
//   if (variants.length === 0) return null;

//   return (
//     <SectionCard
//       icon={<Layers className="text-violet-500" size={16} />}
//       title="Generated Variants"
//     >
//       <div className="overflow-x-auto rounded-xl border border-slate-200">
//         <table className="w-full text-left">
//           <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
//             <tr>
//               <th className="px-4 py-3">Variant Combination</th>
//               <th className="px-4 py-3">SKU</th>
//               <th className="px-4 py-3">Price</th>
//               <th className="px-4 py-3">Stock</th>
//               <th className="px-4 py-3 text-center"></th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100 bg-white">
//             {variants.map((v, i) => (
//               <tr key={v._id} className="hover:bg-slate-50/50 transition-all">
//                 <td className="px-4 py-2.5 text-[10px]">
//                   {v.title}
//                   {/* <input
//                     value={v.sku}
//                     onChange={(e) => {
//                       const next = [...variants];
//                       next[i] = {
//                         ...v,
//                         sku: e.target.value.toUpperCase(),
//                       };
//                       onVariantsChange(next);
//                     }}
//                     className="compact-input py-1 px-2 text-[10px] font-mono w-28"
//                   /> */}
//                 </td>
//                 <td className="px-4 py-2.5">
//                   <input
//                     value={v.sku}
//                     onChange={(e) => {
//                       const next = [...variants];
//                       next[i] = {
//                         ...v,
//                         sku: e.target.value.toUpperCase(),
//                       };
//                       onVariantsChange(next);
//                     }}
//                     className="compact-input py-1 px-2 text-[10px] font-mono w-28"
//                   />
//                 </td>
//                 <td className="px-4 py-2.5">
//                   <input
//                     type="number"
//                     value={v.price}
//                     onChange={(e) => {
//                       const next = [...variants];
//                       next[i] = { ...v, price: e.target.value };
//                       onVariantsChange(next);
//                     }}
//                     className="compact-input py-1 px-2 text-[10px] w-20"
//                   />
//                 </td>
//                 <td className="px-4 py-2.5">
//                   <input
//                     type="number"
//                     value={v.stock}
//                     onChange={(e) => {
//                       const next = [...variants];
//                       next[i] = { ...v, stock: e.target.value };
//                       onVariantsChange(next);
//                     }}
//                     className="compact-input py-1 px-2 text-[10px] w-16"
//                   />
//                 </td>
//                 <td className="px-4 py-2.5 text-center">
//                   <button
//                     onClick={() =>
//                       onVariantsChange(
//                         variants.filter((vt) => vt._id !== v._id),
//                       )
//                     }
//                     className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
//                   >
//                     <Trash2 size={12} />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </SectionCard>
//   );
// }

import React from "react";
import { Layers, Trash2 } from "lucide-react";
import { SectionCard } from "./Common";
import { VariantRow } from "../utils";

interface VariantMatrixProps {
  variants: VariantRow[];
  onVariantsChange: (variants: VariantRow[]) => void;
}

export function VariantMatrix({
  variants,
  onVariantsChange,
}: VariantMatrixProps) {
  if (variants.length === 0) return null;

  return (
    <SectionCard
      icon={<Layers className="text-violet-500" size={16} />}
      title="Generated Variants"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Variant Combination</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {variants.map((v, i) => (
              <tr
                key={v._id}
                className={`hover:bg-slate-50/50 transition-all ${v.status === "inactive" ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-2.5 text-[10px]">{v.title}</td>
                <td className="px-4 py-2.5">
                  <input
                    value={v.sku}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = {
                        ...v,
                        sku: e.target.value.toUpperCase(),
                      };
                      onVariantsChange(next);
                    }}
                    disabled={v.status === "inactive"}
                    className="compact-input py-1 px-2 text-[10px] font-mono w-28 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...v, price: e.target.value };
                      onVariantsChange(next);
                    }}
                    disabled={v.status === "inactive"}
                    className="compact-input py-1 px-2 text-[10px] w-20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    value={v.stock}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...v, stock: e.target.value };
                      onVariantsChange(next);
                    }}
                    disabled={v.status === "inactive"}
                    className="compact-input py-1 px-2 text-[10px] w-16 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => {
                      const next = [...variants];
                      next[i] = {
                        ...v,
                        status: v.status === "active" ? "inactive" : "active",
                      };
                      onVariantsChange(next);
                    }}
                    className={`px-3 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide transition-all ${
                      v.status === "active"
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {v.status}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() =>
                      onVariantsChange(
                        variants.filter((vt) => vt._id !== v._id),
                      )
                    }
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
