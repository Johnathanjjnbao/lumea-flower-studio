import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n";
import { loadPublishedBuilder } from "../bouquetBuilder/storefrontBuilder";
import { loadPublishedCatalog } from "../catalog/data/storefrontCatalog";
import { getCartItemCount, getCartSubtotal, mergeCartItem, removeCartLine, setCartLineQuantity } from "./domain";
import { clearPersistedCart, readCart, writeCart } from "./persistence";
import { reconcileCartItems } from "./reconciliation";
import type { CartItem, CartLine } from "./types";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isReconciling: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  reconcileCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [lines, setLines] = useState<CartLine[]>(() => readCart().map((item) => ({ ...item, validation: { state: "unchecked" } })));
  const linesRef = useRef(lines);
  const reconciliationId = useRef(0);

  useEffect(() => {
    linesRef.current = lines;
    writeCart(lines.map(({ validation: _validation, ...item }) => item));
  }, [lines]);

  const addItem = useCallback((item: CartItem) => setLines((current) => mergeCartItem(current, item)), []);
  const removeItem = useCallback((itemId: string) => setLines((current) => removeCartLine(current, itemId)), []);
  const setQuantity = useCallback((itemId: string, quantity: number) => setLines((current) => setCartLineQuantity(current, itemId, quantity)), []);
  const clearCart = useCallback(() => {
    clearPersistedCart();
    setLines([]);
  }, []);

  const reconcileCart = useCallback(async () => {
    const currentItems = linesRef.current.map(({ validation: _validation, ...item }) => item);
    if (currentItems.length === 0) return;
    const reconciliationItemIds = new Set(currentItems.map((item) => item.id));
    const runId = ++reconciliationId.current;
    setLines((current) => current.map((line) => reconciliationItemIds.has(line.id)
      ? { ...line, validation: { state: "checking" } }
      : line));
    const needsProducts = currentItems.some((item) => item.type === "READY_MADE_PRODUCT");
    const needsBuilder = currentItems.some((item) => item.type === "CUSTOM_BOUQUET");
    const [productsResult, builderResult] = await Promise.allSettled([
      needsProducts ? loadPublishedCatalog(locale, true) : Promise.resolve([]),
      needsBuilder ? loadPublishedBuilder(locale, true) : Promise.resolve({ flowers: [], wrappingTypes: [], wrappingVariants: [] }),
    ]);
    if (runId !== reconciliationId.current) return;
    setLines((current) => current.map((line) => {
      if (!reconciliationItemIds.has(line.id)) return line;
      if (line.type === "READY_MADE_PRODUCT" && productsResult.status === "rejected") return { ...line, validation: { state: "error" } };
      if (line.type === "CUSTOM_BOUQUET" && builderResult.status === "rejected") return { ...line, validation: { state: "error" } };
      const item = (({ validation: _validation, ...rest }) => rest)(line);
      return reconcileCartItems(
        [item],
        productsResult.status === "fulfilled" ? productsResult.value : [],
        builderResult.status === "fulfilled" ? builderResult.value : { flowers: [], wrappingTypes: [], wrappingVariants: [] },
      )[0];
    }));
  }, [locale]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    itemCount: getCartItemCount(lines),
    subtotal: getCartSubtotal(lines),
    isReconciling: lines.some((line) => line.validation.state === "checking"),
    addItem, removeItem, setQuantity, clearCart, reconcileCart,
  }), [addItem, clearCart, lines, reconcileCart, removeItem, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
