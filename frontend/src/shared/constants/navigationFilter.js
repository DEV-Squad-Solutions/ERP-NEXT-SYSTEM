export function canAccessItem(item, roles) {
  if (!item.roles?.length) return true;

  if (roles?.includes("Admin")) return true;

  return item.roles.some((role) => roles?.includes(role));
}

/* =========================================================
   NAVIGATION FILTER
========================================================= */

export function filterNavigationItems(items, roles, hidden = []) {
  if (!items?.length) return [];

  return items.reduce((result, item) => {
    if (item.type === "section") {
      result.push(item);
      return result;
    }

    if (
      !canAccessItem(item, roles) ||
      (item.path && hidden.includes(item.path))
    ) {
      return result;
    }

    if (item.children?.length) {
      const filteredChildren = filterNavigationItems(
        item.children,
        roles,
        hidden,
      );

      if (filteredChildren.length) {
        result.push({
          ...item,
          children: filteredChildren,
        });
      }

      return result;
    }

    result.push(item);

    return result;
  }, []);
}

/* =========================================================
   REMOVE EMPTY SECTIONS
========================================================= */

export function removeEmptySections(items) {
  const result = [];

  items.forEach((item, index) => {
    if (item.type !== "section") {
      result.push(item);
      return;
    }

    const nextItem = items[index + 1];

    if (nextItem && nextItem.type !== "section") {
      result.push(item);
    }
  });

  return result;
}
