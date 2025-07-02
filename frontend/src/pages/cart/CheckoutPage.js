import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import axios from 'axios';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { cart, loading, error, clearCart } = useCart();
  const [user, setUser] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await axios.get('https://indiebasket.onrender.com/api/auth', {
          withCredentials: true,
        });
        setUser(userRes.data);
        const defaultAddress = userRes.data.addresses?.find(a => a.isDefault);
        setDeliveryAddress(defaultAddress || null);

        const promoRes = await axios.get('https://indiebasket.onrender.com/api/promotions/eligible', {
          withCredentials: true,
        });
        setPromotions(promoRes.data);
      } catch (err) {
        console.error('Checkout init failed:', err);
      }
    };
    fetchData();
  }, []);

  const calculateLiveDiscountedPrice = (product) => {
    const discount = product.discount;
    let price = product.price;
    if (discount && (!discount.expiresAt || new Date(discount.expiresAt) > new Date())) {
      if (discount.discountType === 'percentage') price *= 1 - discount.value / 100;
      if (discount.discountType === 'fixed') price -= discount.value;
    }
    return Math.max(0, parseFloat(price.toFixed(2)));
  };

  const calculatePromoEligibleTotal = () => {
    return cart?.items?.reduce((sum, item) =>
      item.product.isPromotionEligible
        ? sum + item.quantity * item.currentPrice
        : sum, 0
    ) || 0;
  };

  const promoEligibleTotal = calculatePromoEligibleTotal();
  const deliveryFee = cart?.total >= 500 ? 0 : 50;

  let promoDiscount = 0;
  if (selectedPromo) {
    if (selectedPromo.discountType === 'percentage') {
      promoDiscount = promoEligibleTotal * (selectedPromo.discountValue / 100);
      if (selectedPromo.maxDiscountAmount) {
        promoDiscount = Math.min(promoDiscount, selectedPromo.maxDiscountAmount);
      }
    } else {
      promoDiscount = selectedPromo.discountValue;
    }
  }

  const orderTotal = cart?.total - promoDiscount + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!deliveryAddress) {
      setCheckoutError('Please select a delivery address.');
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const res = await axios.get('https://indiebasket.onrender.com/api/customer/cart', {
        withCredentials: true,
      });
      const updatedCart = res.data;

      const priceChanged = updatedCart.items.some(item =>
        Math.abs(calculateLiveDiscountedPrice(item.product) - item.currentPrice) > 0.01
      );

      const stockChanged = updatedCart.items.some(item =>
        item.quantity > item.product.stock
      );

      if (priceChanged || stockChanged) {
        setCheckoutError('Some items have changed in price or stock.');
        setTimeout(() => navigate('/cart'), 2000);
        return;
      }

      await axios.post('https://indiebasket.onrender.com/api/orders', {
        deliveryAddress,
        paymentMethod,
        promoCode: selectedPromo?.code,
      }, {
        withCredentials: true,
      });

      setShowOrderConfirmation(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await clearCart();
      navigate('/orders');

    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Order failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromoApply = (promoCode) => {
    const promo = promotions.find(p => p.code === promoCode);
    setSelectedPromo(selectedPromo?.code === promoCode ? null : promo);
    setShowPromoModal(false);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  if (!cart || !cart.items.length) {
    return (
      <div className="checkout-page">
        <h1>Checkout</h1>
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <button className="btn btn-primary" onClick={() => navigate('/products')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1>Checkout</h1>
        <button className="btn btn-primary" onClick={() => navigate('/products')}>
          Continue Shopping
        </button>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Select Address</h3>
            <div className="address-options">
              {user?.addresses?.length > 0 ? (
                user.addresses.map(addr => (
                  <div
                    key={addr._id}
                    className={`address-option ${deliveryAddress?._id === addr._id ? 'selected' : ''}`}
                    onClick={() => {
                      setDeliveryAddress(addr);
                      setShowAddressModal(false);
                    }}
                  >
                    <div className="address-header">
                      <span className="address-label">{addr.label}</span>
                      {addr.isDefault && <span className="address-default-badge">Default</span>}
                    </div>
                    <div className="address-details">
                      <p>{addr.street}</p>
                      <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                      <p>{addr.country}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No saved addresses</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddressModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {showPromoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Select Promotion</h3>
            <div className="promo-options">
              {promotions.length > 0 ? (
                promotions.map(promo => {
                  const eligible = promoEligibleTotal >= promo.minOrderValue;
                  return (
                    <div
                      key={promo._id}
                      className={`promo-option ${selectedPromo?.code === promo.code ? 'selected' : ''} ${!eligible ? 'not-eligible' : ''}`}
                      onClick={() => eligible && handlePromoApply(promo.code)}
                    >
                      <div className="promo-header">
                        <h4 className="promo-title">{promo.name}</h4>
                        <span className="promo-code-badge">{promo.code}</span>
                      </div>
                      <p className="promo-description">{promo.description}</p>
                      <div className="promo-details">
                        <span className="promo-discount">
                          {promo.discountType === 'percentage'
                            ? `${promo.discountValue}% off`
                            : `₹${promo.discountValue} off`}
                        </span>
                        {promo.minOrderValue > 0 && (
                          <span className={`promo-min-order ${eligible ? 'eligible' : 'not-eligible'}`}>
                            Min Order: ₹{promo.minOrderValue} – {eligible ? '✓ Eligible' : 'Not Eligible'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>No promotions available</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPromoModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="checkout-grid">
        <div className="checkout-section checkout-info">
          <h2>Delivery Address</h2>
          {deliveryAddress ? (
            <div className="address-card">
              <div className="address-header">
                <span className="address-label">{deliveryAddress.label}</span>
                {deliveryAddress.isDefault && <span className="address-default-badge">Default</span>}
              </div>
              <div className="address-details">
                <p>{deliveryAddress.street}</p>
                <p>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}</p>
                <p>{deliveryAddress.country}</p>
              </div>
              <button 
                className="btn btn-small btn-secondary" 
                onClick={() => setShowAddressModal(true)}
              >
                Change Address
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddressModal(true)}
            >
              Select Address
            </button>
          )}

          <h2>Payment Method</h2>
          <div className="payment-options">
            {['cod', 'card', 'upi'].map(method => (
              <label key={method} className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                <span className="payment-label">{method.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="checkout-section checkout-summary">
          <h2>Order Summary</h2>
          <div className="order-items">
            {cart.items.map(item => (
              <div key={item._id} className="order-item">
                <div className="item-info">
                  <h4 className="item-name">{item.product.name}</h4>
                  <p className="item-quantity">{item.quantity} × ₹{item.currentPrice.toFixed(2)}</p>
                </div>
                <p className="item-total">₹{(item.quantity * item.currentPrice).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="promo-section">
            {selectedPromo ? (
              <div className="applied-promo">
                <div className="promo-info">
                  <span className="promo-label">Applied:</span>
                  <span className="promo-code">{selectedPromo.code}</span>
                  <span className="promo-discount">–₹{promoDiscount.toFixed(2)}</span>
                </div>
                <button 
                  className="btn btn-small btn-text" 
                  onClick={() => setSelectedPromo(null)}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-small btn-secondary" 
                onClick={() => setShowPromoModal(true)}
              >
                Apply Promotion
              </button>
            )}
          </div>

          <div className="order-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{cart?.subtotal?.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Product Discounts:</span>
              <span className="discount">–₹{(cart?.subtotal - cart?.total).toFixed(2)}</span>
            </div>
            {selectedPromo && (
              <div className="summary-row">
                <span>Promo Discount:</span>
                <span className="discount">–₹{promoDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Delivery Fee:</span>
              <span>₹{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <strong>Total:</strong>
              <strong>₹{orderTotal.toFixed(2)}</strong>
            </div>

          </div>

          {checkoutError && <div className="error-message">{checkoutError}</div>}

          <button
            className="btn btn-primary btn-large place-order-btn"
            onClick={handlePlaceOrder}
            disabled={isProcessing || !deliveryAddress}
          >
            {isProcessing ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>

      {showOrderConfirmation && (
        <div className="order-confirmation-popup">
          <div className="confirmation-content">
            <div className="confirmation-icon">✓</div>
            <h3>Order Placed Successfully!</h3>
            <p>Redirecting to your orders...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;