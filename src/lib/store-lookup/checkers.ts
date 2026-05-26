import { fetchHybrisStoreOffers } from "./hybris-store";

export function fetchCheckersOffers(query: string) {
  return fetchHybrisStoreOffers("Checkers", "https://products.checkers.co.za", "/search?q=", query);
}
