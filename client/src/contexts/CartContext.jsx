import { createContext, useContext, useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Fetch cart khi user đăng nhập
  useEffect(() => {
    if (token) {
      fetchCart();
      return;
    }

    // Token mất (logout/hết hạn) thì reset cart state trên client.
    setItems([]);
  }, [token]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get("/cart");
      setItems(response.data.data.items || []);
    } catch (err) {
      console.error("Fetch cart error:", err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (productId, quantity, size) => {
    const response = await axiosClient.post("/cart/items", {
      productId,
      quantity,
      size,
    });
    setItems(response.data.data.items || []);
    return response.data;
  };

  const updateItem = async (itemId, quantity) => {
    const response = await axiosClient.put("/cart/items/" + itemId, {
      itemId,
      quantity,
    });
    setItems(response.data.data.items || []);
    return response.data;
  };

  const removeItem = async (itemId) => {
    const response = await axiosClient.delete("/cart/items/" + itemId);
    setItems(response.data.data.items || []);
    return response.data;
  };

  const clearCart = async () => {
    await axiosClient.delete("/cart");
    setItems([]);
  };

  const cartCount = items.length;
  const cartTotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        cartTotal,
        loading,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
