import { fetchHybrisStoreOffers } from "./hybris-store";

export function fetchShopriteOffers(query: string) {
  return fetchHybrisStoreOffers("Shoprite", "https://www.shoprite.co.za", "/search?q=", query);
}
