export const DETAIL_QUERY = "m";

export function detailIdFromSearchParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): string | null {
  const value = searchParams[DETAIL_QUERY];
  const raw = Array.isArray(value) ? value[0] : value;
  const id = raw?.trim();
  return id ? id : null;
}

export function detailIdFromLocationSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(DETAIL_QUERY)?.trim();
  return id ? id : null;
}

export function publicDetailPath(id: string): string {
  const params = new URLSearchParams();
  params.set(DETAIL_QUERY, id);
  return `/?${params.toString()}`;
}

export function absoluteDetailUrl(id: string): string {
  return new URL(publicDetailPath(id), window.location.origin).toString();
}

export function openableDetailId(
  media: { id: string; detailEnabled: boolean }[],
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const item = media.find((entry) => entry.id === id);
  if (!item || item.detailEnabled === false) return null;
  return item.id;
}

export function syncDetailSearchParam(id: string | null) {
  if (window.location.pathname !== "/") return;

  const url = new URL(window.location.href);
  if (id) url.searchParams.set(DETAIL_QUERY, id);
  else url.searchParams.delete(DETAIL_QUERY);

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}
