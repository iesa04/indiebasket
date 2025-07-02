import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CartItem from '../../components/cart/cartItem/CartItem';
import './CartPage.css';

const CartPage = () => {
  // Initialize cart with safe defaults
  const {
    cart = { items: [], subtotal: 0, discounts: 0, total: 0 },
    loading,
    error,
    updateCartItem,
    removeFromCart,
    clearCart,
    acceptNewPrice,
    acceptNewStock,
    acceptAllChanges,
    refreshCart,
  } = useCart();

  // State management
  const [optimisticCart, setOptimisticCart] = useState({
    items: [],
    subtotal: 0,
    discounts: 0,
    total: 0
  });
  const [processingItems, setProcessingItems] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);
  const navigate = useNavigate();

  // Load and sync cart data
  useEffect(() => {
    const loadCart = async () => {
      try {
        await refreshCart();
      } catch (err) {
        setLocalError('Failed to load cart. Please try again.');
        console.error('Cart load error:', err);
      }
    };
    loadCart();
  }, []);

  // Safely sync with context cart
  useEffect(() => {
    if (cart && Array.isArray(cart.items)) {
      setOptimisticCart({
        items: cart.items.map(item => ({
          ...item,
          // Ensure quantity is always a valid number
          quantity: getValidQuantity(item.quantity)
        })),
        subtotal: cart.subtotal || 0,
        discounts: cart.discounts || 0,
        total: cart.total || 0
      });
    }
  }, [cart]);

  // Helper function to ensure valid quantity
  const getValidQuantity = (qty) => {
    const num = Number(qty);
    return !isNaN(num) && num >= 1 ? Math.min(Math.floor(num), 100) : 1;
  };

  // Calculate live price with error handling
  const calculateLivePrice = (product) => {
    try {
      if (!product?.price) return 0;
      if (!product?.discount) return product.price;

      const { discountType, value, expiresAt } = product.discount;
      const isActive = !expiresAt || new Date(expiresAt) > new Date();
      if (!isActive) return product.price;

      return discountType === 'percentage'
        ? product.price * (1 - value / 100)
        : Math.max(0, product.price - value);
    } catch (err) {
      console.error('Price calculation error:', err);
      return product?.price || 0;
    }
  };

  // Handle quantity changes with validation
  const handleQuantityChange = async (itemId, newQuantity) => {
    const quantity = getValidQuantity(newQuantity);
    
    const cartItem = optimisticCart.items.find(item => item._id === itemId);
    if (!cartItem) {
      setLocalError('Item not found in cart');
      return;
    }

    if (quantity > (cartItem.product?.stock || 0)) {
      setLocalError(`Only ${cartItem.product.stock} items available`);
      return;
    }

    setProcessingItems(prev => ({ ...prev, [itemId]: true }));
    setLocalError(null);

    try {
      // Optimistic UI update
      setOptimisticCart(prev => {
        const updatedItems = prev.items.map(item => 
          item._id === itemId ? { ...item, quantity } : item
        );
        const subtotal = updatedItems.reduce(
          (sum, item) => sum + (item.quantity * item.currentPrice || 0),
          0
        );
        const total = subtotal - prev.discounts;
        return { ...prev, items: updatedItems, subtotal, total };
      });

      // Update server with validated number
      await updateCartItem(itemId, quantity);
      await refreshCart();
    } catch (err) {
      setLocalError(err.message || 'Failed to update quantity');
      console.error('Update error:', err);
      await refreshCart(); // Revert on error
    } finally {
      setProcessingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Handle item removal
  const handleRemoveItem = async (itemId) => {
    setProcessingItems(prev => ({ ...prev, [itemId]: true }));
    setLocalError(null);

    try {
      const filteredItems = optimisticCart.items.filter(item => item._id !== itemId);
      const subtotal = filteredItems.reduce(
        (sum, item) => sum + (item.quantity * item.currentPrice || 0),
        0
      );
      const total = subtotal - optimisticCart.discounts;

      setOptimisticCart(prev => ({
        ...prev,
        items: filteredItems,
        subtotal,
        total
      }));

      await removeFromCart(itemId);
      await refreshCart();
    } catch (err) {
      setLocalError(err.message || 'Failed to remove item');
      await refreshCart();
    } finally {
      setProcessingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };


  // Other action handlers (similar pattern)
  const handleAcceptNewPrice = async (itemId) => {
    setProcessingItems(prev => ({ ...prev, [itemId]: true }));
    setLocalError(null);
    
    try {
      await acceptNewPrice(itemId);
      await refreshCart();
    } catch (err) {
      setLocalError(err.message || 'Failed to accept new price');
    } finally {
      setProcessingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleAcceptNewStock = async (itemId) => {
  setProcessingItems(prev => ({ ...prev, [itemId]: true }));
  setLocalError(null);

  try {
    await acceptNewStock(itemId);
    await refreshCart();
  } catch (err) {
    setLocalError(err.message || 'Failed to accept stock change');
  } finally {
    setProcessingItems(prev => ({ ...prev, [itemId]: false }));
  }
};


  const handleClearCart = async () => {
    setIsProcessing(true);
    setLocalError(null);
    
    try {
      setOptimisticCart({ items: [], subtotal: 0, discounts: 0, total: 0 });
      await clearCart();
    } catch (err) {
      setLocalError(err.message || 'Failed to clear cart');
      await refreshCart();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await refreshCart();
      navigate('/checkout');
    } catch (err) {
      setLocalError(err.message || 'Failed to proceed to checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate cart issues
  const { priceChangedItems, stockIssues } = (() => {
    try {
      const priceChanged = optimisticCart.items
        .filter(item => item?.product && typeof item?.currentPrice === 'number')
        .filter(item => {
          const livePrice = calculateLivePrice(item.product);
          return Math.abs(livePrice - item.currentPrice) > 0.01;
        });

      const stockIssues = optimisticCart.items
        .filter(item => typeof item?.product?.stock === 'number' && typeof item?.quantity === 'number')
        .filter(item => item.quantity > item.product.stock);

      return { priceChangedItems: priceChanged, stockIssues };
    } catch (err) {
      console.error('Issue detection error:', err);
      return { priceChangedItems: [], stockIssues: [] };
    }
  })();

  // Render loading/error states
  if (loading && optimisticCart.items.length === 0) {
    return <LoadingSpinner />;
  }

  if (error || localError) {
    return (
      <div className="cart-page">
        <h1>Your Shopping Cart</h1>
        <div className="error-message">
          {error?.message || localError}
          <button onClick={() => window.location.reload()} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Your Shopping Cart</h1>
        {optimisticCart.items.length === 0 ?(<></>):        
        (<button 
          className="btn btn-primary" 
          onClick={() => navigate('/products')}
          disabled={isProcessing}
        >
          Continue Shopping
        </button>)}

      </div>


      {optimisticCart.items.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/products')}
            disabled={isProcessing}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          {/* Warning messages */}
          {priceChangedItems.length > 0 && (
            <div className="cart-warning">
              ⚠️ Price changes detected for {priceChangedItems.length} item(s)
            </div>
          )}
          {stockIssues.length > 0 && (
            <div className="cart-warning">
              ⚠️ Stock issues with {stockIssues.length} item(s)
            </div>
          )}

          {/* Cart items */}
          <div className="cart-items">
            {optimisticCart.items.map(item => (
              <CartItem
                key={item._id}
                item={item}
                livePrice={calculateLivePrice(item.product)}
                showPriceChange={priceChangedItems.some(i => i._id === item._id)}
                showStockChange={stockIssues.some(i => i._id === item._id)}
                disabled={processingItems[item._id] || isProcessing}
                onQuantityChange={handleQuantityChange}
                onRemove={() => handleRemoveItem(item._id)}
                onAcceptPrice={() => handleAcceptNewPrice(item._id)}
                onAcceptStock={() => handleAcceptNewStock(item._id)}
                onAcceptAllChanges={() => acceptAllChanges(item._id)}
                maxQuantity={item.product?.stock || 0}
              />
            ))}
          </div>

          {/* Cart summary */}
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{optimisticCart.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Discounts:</span>
              <span className="discount">-₹{optimisticCart.discounts.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{optimisticCart.total.toFixed(2)}</span>
            </div>

            <div className="cart-actions">
              <button
                className="btn btn-secondary"
                onClick={handleClearCart}
                disabled={isProcessing}
              >
                Clear Cart
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCheckout}
                disabled={isProcessing || priceChangedItems.length > 0 || stockIssues.length > 0}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;