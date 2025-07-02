// CartItem.js
import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import './CartItem.css';

const CartItem = ({
  item,
  onQuantityChange,
  onRemove,
  onAcceptPrice,
  onAcceptStock,
  onAcceptAllChanges,
  disabled,
  showPriceChange,
  showStockChange,
  livePrice,
  maxQuantity
}) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setQuantity(item.quantity);
  }, [item.quantity]);

  const handleQuantityUpdate = async (newQty) => {
    if (newQty === item.quantity || newQty > maxQuantity || newQty < 1) return;
    setIsUpdating(true);
    await onQuantityChange(item._id, newQty);
    setIsUpdating(false);
  };

  const handleIncrement = () => {
    const newQty = quantity + 1;
    if (newQty <= maxQuantity) {
      setQuantity(newQty);
      handleQuantityUpdate(newQty);
    }
  };

  const handleDecrement = () => {
    const newQty = quantity - 1;
    if (newQty >= 1) {
      setQuantity(newQty);
      handleQuantityUpdate(newQty);
    } else {
      onRemove(item._id);
    }
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const newQty = Math.min(Math.max(value, 1), maxQuantity);
    setQuantity(newQty);
  };

  const handleBlur = () => {
    if (quantity !== item.quantity) {
      handleQuantityUpdate(quantity);
    }
  };

  const imageUrl = item.product.images?.[0] || '/placeholder-product.png';
  const unit = item.product.unit || 'Each';
  const originalPrice = item.priceAtAddition;
  const currentPrice = item.currentPrice;
  const total = (currentPrice * item.quantity).toFixed(2);

  const bothChanged = showPriceChange && showStockChange;

  return (
    <div className={`cart-item ${showPriceChange || showStockChange ? 'price-changed' : ''}`}>
      <div className="item-image">
        <img src={imageUrl} alt={item.product.name} />
      </div>

      <div className="item-details">
        <h3>{item.product.name}</h3>
        <p className="item-unit">{unit}</p>

        {(showPriceChange || showStockChange) && (
          <div className="price-change-options">
            <div className="change-notice">
              <AlertTriangle size={16} className="alert-icon" />
              <div className="change-message">
                {bothChanged && (
                  <>
                    <p>Price changed: <s>₹{originalPrice.toFixed(2)}</s> →{' '}
                    <strong className="new-price">₹{livePrice.toFixed(2)}</strong></p>
                    <p>Stock reduced: You requested <strong>{item.quantity}</strong> but only{' '}
                    <strong>{maxQuantity}</strong> in stock.</p>
                  </>
                )}

                {!bothChanged && showPriceChange && (
                  <p>Price changed: <s>₹{originalPrice.toFixed(2)}</s> →{' '}
                  <strong className="new-price">₹{livePrice.toFixed(2)}</strong></p>
                )}

                {!bothChanged && showStockChange && (
                  <p>Only <strong>{maxQuantity}</strong> in stock, but you requested{' '}
                  <strong>{item.quantity}</strong>.</p>
                )}
              </div>
            </div>

            <div className="price-buttons">
              {bothChanged ? (
                <button 
                  className="accept-button"
                  onClick={() => onAcceptAllChanges(item._id)} 
                  disabled={disabled}
                >
                  Accept Both Changes
                </button>
              ) : showPriceChange ? (
                <button 
                  className="accept-button"
                  onClick={() => onAcceptPrice(item._id)} 
                  disabled={disabled}
                >
                  Keep New Price
                </button>
              ) : (
                <button 
                  className="accept-button"
                  onClick={() => onAcceptStock(item._id)} 
                  disabled={disabled}
                >
                  Adjust to {maxQuantity}
                </button>
              )}
              <button 
                className="remove-button"
                onClick={() => onRemove(item._id)} 
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {!showPriceChange && !showStockChange && (
        <>
          <div className="item-price">
            <div className="price-display">
              {originalPrice !== currentPrice && (
                <span className="original-price">₹{originalPrice.toFixed(2)}</span>
              )}
              <span className="current-price">₹{currentPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="item-quantity">
          <button
            className="quantity-button minus-btn"
            onClick={handleDecrement}
            disabled={disabled || isUpdating || quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="quantity-icon" size={18} /> {/* Increased from 18 to 24 */}
          </button>
          <input
            type="number"
            min="1"
            max={maxQuantity}
            value={quantity}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled || isUpdating}
            className="quantity-input"
          />
          <button
            className="quantity-button plus-btn"
            onClick={handleIncrement}
            disabled={disabled || isUpdating || quantity >= maxQuantity}
            aria-label="Increase quantity"
          >
            <Plus className="quantity-icon" size={24} /> {/* Increased from 18 to 24 */}
          </button>
        </div>

          <div className="item-total">₹{total}</div>

          <button
            className="remove-item"
            onClick={() => onRemove(item._id)}
            disabled={disabled}
          >
            <Trash2 size={18} />
          </button>
        </>
      )}
    </div>
  );
};

export default CartItem;