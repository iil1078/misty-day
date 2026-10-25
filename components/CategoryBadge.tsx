import { CATEGORY_STYLES, type Category } from "@/lib/types";

export function CategoryBadge({ category }: { category: Category }) {
  const style = CATEGORY_STYLES[category];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
      <span aria-hidden>{style.icon}</span>
      {category}
    </span>
  );
}
