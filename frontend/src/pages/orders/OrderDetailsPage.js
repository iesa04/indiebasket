import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './OrderDetailsPage.css';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`https://indiebasket.onrender.com/api/orders/${id}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch order');
        }

        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;
  if (!order) return <div className="error-message">Order not found</div>;

  return (
    <div className="order-details-page">
      <Link to="/orders" className="btn btn-small btn-secondary back-link">
        ← Back to Orders
      </Link>
      <h1>Order #{order.orderId}</h1>
      
      <div className="order-status">
        <span className={`status-badge ${order.status}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
        <p className="order-date">Placed on {new Date(order.placedAt).toLocaleString()}</p>
      </div>
      
      <div className="order-summary-grid">
        <div className="summary-section">
          <h3>Delivery Address</h3>
          <div className="address-details">
            <p>{order.deliveryAddress.street}</p>
            <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</p>
            <p>{order.deliveryAddress.country}</p>
          </div>
        </div>
        
        <div className="summary-section">
          <h3>Payment Information</h3>
          <div className="payment-details">
            <div className="detail-row">
              <span className="detail-label">Method:</span>
              <span className="detail-value">{order.payment.method.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">{order.payment.status}</span>
            </div>
            {order.payment.transactionId && (
              <div className="detail-row">
                <span className="detail-label">Transaction ID:</span>
                <span className="detail-value">{order.payment.transactionId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="order-items-section">
        <h3>Order Items</h3>
        <div className="order-items">
          {order.items.map(item => (
            <div key={item._id || item.product} className="order-item">
              <div className="item-info">
                <h4 className="item-name">{item.name}</h4>
                <p className="item-quantity-price">{item.quantity} × ₹{item.priceAtPurchase.toFixed(2)}</p>
              </div>
              <div className="item-total">
                ₹{(item.quantity * item.priceAtPurchase).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="order-totals">
        <div className="total-row">
          <span className="total-label">Subtotal:</span>
          <span className="total-value">₹{order.subtotal.toFixed(2)}</span>
        </div>
        {order.discounts > 0 && (
          <div className="total-row">
            <span className="total-label">Product Discounts:</span>
            <span className="total-value discount">-₹{order.discounts.toFixed(2)}</span>
          </div>
        )}
        {order.appliedPromotions.length > 0 && (
          <div className="total-row">
            <span className="total-label">Promo Discount ({order.appliedPromotions[0].code}):</span>
            <span className="total-value discount">-₹{order.appliedPromotions[0].discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="total-row">
          <span className="total-label">Delivery Fee:</span>
          <span className="total-value">₹{order.deliveryFee.toFixed(2)}</span>
        </div>
        <div className="total-row grand-total">
          <span className="total-label">Total:</span>
          <span className="total-value">₹{order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;