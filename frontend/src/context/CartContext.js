import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const CartProvider = ({ children, user }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartUpdating, setCartUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchCart = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await axios.get('https://indiebasket.onrender.com/api/customer/cart', {
        withCredentials: true,
      });
      setCart(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      setCartUpdating(true);
      const response = await axios.post(
        'https://indiebasket.onrender.com/api/customer/cart',
        { productId, quantity },
        { withCredentials: true }
      );
      setCart(response.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to add to cart',
      };
    } finally {
      setCartUpdating(false);
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      setCartUpdating(true);
      const response = await axios.put(
        `https://indiebasket.onrender.com/api/customer/cart/item/${itemId}`,
        { quantity },
        { withCredentials: true }
      );
      setCart(response.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update cart item',
      };
    } finally {
      setCartUpdating(false);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      setCartUpdating(true);
      const response = await axios.delete(
        `https://indiebasket.onrender.com/api/customer/cart/item/${itemId}`,
        { withCredentials: true }
      );
      setCart(response.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to remove from cart',
      };
    } finally {
      setCartUpdating(false);
    }
  };

  const clearCart = async () => {
    try {
      setCartUpdating(true);
      await axios.delete('https://indiebasket.onrender.com/api/customer/cart', {
        withCredentials: true,
      });
      setCart(null);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to clear cart',
      };
    } finally {
      setCartUpdating(false);
    }
  };

  const acceptNewPrice = async (itemId) => {
    try {
      setCartUpdating(true);
      const response = await axios.put(
        `https://indiebasket.onrender.com/api/customer/cart/item/${itemId}/accept-price`,
        {},
        { withCredentials: true }
      );
      setCart(response.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update price',
      };
    } finally {
      setCartUpdating(false);
    }
  };

  const acceptNewStock = async (itemId) => {
    try {
      setCartUpdating(true);
      const response = await axios.put(
        `https://indiebasket.onrender.com/api/customer/cart/item/${itemId}/accept-stock`,
        {},
        { withCredentials: true }
      );
      setCart(response.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update stock',
      };
    } finally {
      setCartUpdating(false);
    }
  };


  const acceptAllChanges = async (itemId) => {
    const priceResult = await acceptNewPrice(itemId);
    if (!priceResult.success) return priceResult;

    const stockResult = await acceptNewStock(itemId);
    if (!stockResult.success) return stockResult;

    return { success: true };
  };



  useEffect(() => {
    fetchCart();
  }, [user]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        cartUpdating,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        refreshCart: fetchCart,
        acceptNewPrice,
        acceptNewStock, 
        acceptAllChanges,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
