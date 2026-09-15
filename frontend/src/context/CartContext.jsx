import { createContext, useContext, useState, useMemo, useCallback } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((crop, quantity) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.crop._id === crop._id);
      if (existing) {
        return prev.map((i) =>
          i.crop._id === crop._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { crop, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((cropId) => {
    setItems((prev) => prev.filter((i) => i.crop._id !== cropId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.crop.price, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, clearCart, totalAmount, totalItems }),
    [items, addToCart, removeFromCart, clearCart, totalAmount, totalItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
