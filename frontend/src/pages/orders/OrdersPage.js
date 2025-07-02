import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './OrdersPage.css';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('https://indiebasket.onrender.com/api/fetch-orders', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch orders');
        }

        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="orders-page">
      <h1>My Orders</h1>
      
      {orders.length === 0 ? (
        <div className="no-orders">
          <p>You haven't placed any orders yet.</p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <h3>Order #{order.orderId}</h3>
                <span className={`status-badge ${order.status}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              
              <div className="order-details">
                <div className="order-info">
                  <div className="info-row">
                    <span className="info-label">Date:</span>
                    <span className="info-value">{new Date(order.placedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total:</span>
                    <span className="info-value">₹{order.total.toFixed(2)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Payment:</span>
                    <span className="info-value">
                      {order.payment.method.toUpperCase()} ({order.payment.status})
                    </span>
                  </div>
                </div>
                
                <div className="order-actions">
                  <Link to={`/orders/${order._id}`} className="btn btn-small btn-secondary">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;