import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './OrderManagement.css';

Modal.setAppElement('#root');

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const statusOptions = [
    'all',
    'placed',
    'confirmed',
    'packed',
    'shipped',
    'delivered',
    'cancelled'
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/orders', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const openDetailsModal = (order) => {
    setCurrentOrder(order);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setCurrentOrder(null);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update order status');
      
      const updatedOrder = await response.json();
      setOrders(orders.map(order => 
        order._id === orderId ? updatedOrder : order
      ));
      
      // Update current order if it's the one being viewed
      if (currentOrder && currentOrder._id === orderId) {
        setCurrentOrder(updatedOrder);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="order-management-container">
      <div className="header-section">
        <h2>Order Management</h2>
        <div className="status-filter">
          <label>Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order._id}>
                <td>{order.orderId}</td>
                <td>{order.user?.name || 'N/A'}</td>
                <td>{new Date(order.placedAt).toLocaleDateString()}</td>
                <td>{order.items.length}</td>
                <td>₹{order.total.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => openDetailsModal(order)} 
                    className="action-btn view"
                  >
                    View
                  </button>
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="placed">Placed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onRequestClose={closeDetailsModal}
        className="order-modal large"
        overlayClassName="modal-overlay"
      >
        {currentOrder && (
          <>
            <div className="modal-header">
              <h3>Order Details - {currentOrder.orderId}</h3>
              <button onClick={closeDetailsModal} className="close-modal-btn">
                &times;
              </button>
            </div>
            
            <div className="order-details">
              <div className="order-section">
                <h4>Customer Information</h4>
                <div className="info-grid">
                  <div>
                    <strong>Name:</strong> {currentOrder.user?.name || 'N/A'}
                  </div>
                  <div>
                    <strong>Contact:</strong> {currentOrder.user?.phone || 'N/A'}
                  </div>
                  <div>
                    <strong>Email:</strong> {currentOrder.user?.email || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="order-section">
                <h4>Delivery Address</h4>
                <div className="address-box">
                  {currentOrder.deliveryAddress ? (
                    <>
                      <div>{currentOrder.deliveryAddress.street}</div>
                      <div>
                        {currentOrder.deliveryAddress.city}, {currentOrder.deliveryAddress.state}
                      </div>
                      <div>
                        {currentOrder.deliveryAddress.postalCode}, {currentOrder.deliveryAddress.country}
                      </div>
                    </>
                  ) : (
                    <div>No address provided</div>
                  )}
                </div>
              </div>

              <div className="order-section">
                <h4>Order Items</h4>
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.priceAtPurchase.toFixed(2)}</td>
                        <td>₹{(item.priceAtPurchase * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-section">
                <h4>Payment & Status</h4>
                <div className="info-grid">
                  <div>
                    <strong>Payment Method:</strong> {currentOrder.payment?.method || 'N/A'}
                  </div>
                  <div>
                    <strong>Payment Status:</strong> {currentOrder.payment?.status || 'N/A'}
                  </div>
                  <div>
                    <strong>Order Status:</strong>
                    <select
                      value={currentOrder.status}
                      onChange={(e) => {
                        handleStatusChange(currentOrder._id, e.target.value);
                        setCurrentOrder({
                          ...currentOrder,
                          status: e.target.value
                        });
                      }}
                      className="status-select"
                    >
                      <option value="placed">Placed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>₹{currentOrder.subtotal.toFixed(2)}</span>
                </div>
                {currentOrder.discounts > 0 && (
                  <div className="summary-row">
                    <span>Discounts:</span>
                    <span>-₹{currentOrder.discounts.toFixed(2)}</span>
                  </div>
                )}
                {currentOrder.appliedPromotions?.length > 0 && (
                  <div className="summary-row">
                    <span>Promotions:</span>
                    <span>
                      {currentOrder.appliedPromotions.map(promo => (
                        <div key={promo.code}>
                          {promo.code} (-₹{promo.discountAmount.toFixed(2)})
                        </div>
                      ))}
                    </span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Delivery Fee:</span>
                  <span>₹{currentOrder.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <strong>Total:</strong>
                  <strong>₹{currentOrder.total.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default OrderManagement;