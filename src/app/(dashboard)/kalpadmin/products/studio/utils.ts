import type { SourceEntityRefDto } from "@/lib/contracts/source";

export interface VariantRow {
  _id?: string;
  productId?: string;
  sku: string;
  price: string;
  stock: string;
  status: string;
  createdAt: string;
  optionValues: Record<string, string>;
  title?: string;
}

export type ProductOption = {
  key: string;
  label: string;
  values: string[];
  selectedValues: string[];
  useForVariants: boolean;
  draftValue: string;
  attributeSetId?: string;
  attributeSetName?: string;
};

export type ProductGalleryItem = {
  id: string;
  url: string;
  alt: string;
  order: number;
};

export type RelatedProduct = {
  _id: string;
  name?: string;
  sku?: string;
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function sanitizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function composeVariantKey(values: Record<string, string>): string {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
}

export function buildCombinationTitle(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" / ");
}

export function parseGallery(value: unknown): ProductGalleryItem[] {
  if (!Array.isArray(value)) return [];
  const items: ProductGalleryItem[] = value
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url) return null;
        return { id: `gallery-${index + 1}`, url, alt: "", order: index };
      }
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === "string" ? row.url.trim() : "";
      if (!url) return null;
      return {
        id:
          typeof row.id === "string" && row.id.trim()
            ? row.id.trim()
            : `gallery-${index + 1}`,
        url,
        alt: typeof row.alt === "string" ? row.alt : "",
        order: typeof row.order === "number" ? row.order : index,
      };
    })
    .filter((item): item is ProductGalleryItem => Boolean(item));

  return items
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(new Error(`Unable to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function buildVariantCombinations(
  options: ProductOption[],
): Record<string, string>[] {
  const axes = options
    .filter(
      (option) => option.useForVariants && option.selectedValues.length > 0,
    )
    .map((option) => ({ key: option.key, values: option.selectedValues }));

  if (axes.length === 0) return [];

  const recurse = (
    index: number,
    acc: Record<string, string>,
  ): Record<string, string>[] => {
    if (index >= axes.length) return [acc];
    const axis = axes[index];
    const results: Record<string, string>[] = [];
    for (const value of axis.values) {
      results.push(...recurse(index + 1, { ...acc, [axis.key]: value }));
    }
    return results;
  };

  return recurse(0, {});
}

export function readTenantKeyFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )kalp_active_tenant=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export const generateSKUWithBaseSKU = (
  baseSKU: string,
  obj: Record<string, string>,
) => {
  const generated = Object.values(obj)
    .map((words) => {
      return words.slice(0, 2);
    })
    .join("-");
  return baseSKU + "-" + generated;
};
