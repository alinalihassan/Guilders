import type { Category, CategoryTree } from "@guilders/api/types";

export type CategoryFlatItem = Category & { depth?: number };

/**
 * Builds a category tree from a flat list (e.g. API response). Roots first, children sorted by name.
 */
export function buildCategoryTree(flat: Category[]): CategoryTree[] {
  const byParent = new Map<number | null, Category[]>();
  for (const c of flat) {
    const pid = c.parent_id;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  function children(parentId: number | null): CategoryTree[] {
    const list = byParent.get(parentId) ?? [];
    return list.map((c) => {
      const childList = children(c.id);
      const node: CategoryTree = {
        ...c,
        ...(childList.length > 0 ? { children: childList } : {}),
      };
      return node;
    });
  }
  return children(null);
}

/**
 * Flattens a category tree to a depth-first list (parent then its children, sorted).
 * Each item is the category without `children`. Pass `withDepth: true` for picker indentation.
 */
export function flattenCategoryTree(
  tree: CategoryTree[],
  options?: { withDepth?: boolean },
): CategoryFlatItem[] {
  const out: CategoryFlatItem[] = [];
  function visit(nodes: CategoryTree[], depth: number) {
    for (const node of nodes) {
      const { children: _c, ...rest } = node;
      const item = rest as CategoryFlatItem;
      if (options?.withDepth) item.depth = depth;
      out.push(item);
      if (node.children?.length) visit(node.children, depth + 1);
    }
  }
  visit(tree, 0);
  return out;
}

/**
 * Returns the set of category ids that are the given category or any of its descendants.
 * Use to exclude from parent selector (prevent cycles).
 */
export function getCategoryAndDescendantIds(tree: CategoryTree[], categoryId: number): Set<number> {
  const set = new Set<number>();
  function addSubtree(nodes: CategoryTree[]) {
    for (const node of nodes) {
      set.add(node.id);
      if (node.children?.length) addSubtree(node.children);
    }
  }
  function findAndAdd(nodes: CategoryTree[]): boolean {
    for (const node of nodes) {
      if (node.id === categoryId) {
        addSubtree([node]);
        return true;
      }
      if (node.children?.length && findAndAdd(node.children)) return true;
    }
    return false;
  }
  findAndAdd(tree);
  return set;
}

/**
 * Builds a map from category id to category.
 * Use for resolving category_id to name/color in transactions and Sankey.
 * Pass the flat list from the API (or useCategories().data).
 */
export function buildCategoryLookup(categories: Category[]): Map<number, Category> {
  const map = new Map<number, Category>();
  for (const c of categories) map.set(c.id, c);
  return map;
}
