import { useNavigate } from 'react-router-dom';
import './DeliveryDashboard.css';

const DeliveryDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className="delivery-container">
      <header className="delivery-header">
        <h1>Delivery Dashboard</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="delivery-content">
        <h2>Your Delivery Assignments</h2>
        <div className="assignment-list">
          {/* Delivery assignments would be listed here */}
          <div className="assignment-card">
            <h3>Order #12345</h3>
            <p>Customer: John Doe</p>
            <p>Address: 123 Main St</p>
            <button>Mark as Delivered</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;