import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartLink from '../cart/CartLink'; 
import Footer from './Footer';
import './CustomerLayout.css';

const CustomerLayout = ({ children, user, onLogout }) => {
  const { cart } = useCart();

  // Function to get the default address label or "Select Address"
  const getDeliveryLabel = () => {
    if (!user?.addresses?.length) return "Select Address";
    const defaultAddress = user.addresses.find(addr => addr.isDefault);
    return defaultAddress ? `Deliver to ${defaultAddress.label}` : "Select Address";
  };

  return (
    <div className="customer-layout">
      <nav className="navbar">
        <div className="container">
          <div className="nav-brand">
            <Link to="/" className="logo">IndieBasket</Link>
          </div>
          <div className="nav-links">
            <Link to="/products" className="nav-link">Products</Link>
            {user && user.role === 'customer' && (
              <>
                <Link to="/orders" className="nav-link">My Orders</Link>
                <CartLink />
              </>
            )}
          </div>
          <div className="nav-actions">
            {user ? (
              <>
                <Link to="/addresses" className="deliver-to-link">
                  {getDeliveryLabel()}
                </Link>
                <button onClick={onLogout} className="logout-btn">Logout</button>
              </>
            ) : (
              <Link to="/login" className="login-btn">Login</Link>
            )}
          </div>
        </div>
      </nav>

      <main className="customer-content">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLayout;