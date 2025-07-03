import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import CustomerLayout from './components/layout/CustomerLayout';
import ProductsPage from './pages/products/ProductsPage';
import SignupPage from './pages/auth/SignupPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import AddressManagementPage from './pages/address/AddressManagementPage';
import AddAddressPage from './pages/address/AddAddressPage';
import EditAddressPage from './pages/address/EditAddressPage';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailsPage from './pages/orders/OrderDetailsPage';
import { CartProvider } from './context/CartContext';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/cart/CheckoutPage';
import './App.css';

// Role-based route protector
const RoleRoute = ({ user, role, children }) => {
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('https://indiebasket.onrender.com/api/auth', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        setError('Failed to check authentication');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Only redirect non-customer users
    if (userData.role !== 'customer') {
      window.location.pathname = userData.role === 'admin' ? '/admin' : '/delivery';
    }
  };

  const handleLogout = async () => {
  try {
    // API logout call
    const response = await fetch('https://indiebasket.onrender.com/api/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Logout API failed');

    // Manual cookie deletion (client-side fallback)
    document.cookie = 'token=; path=/; domain=indiebasket.onrender.com; ' + 
      'expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=none';

    // Clear all application state
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();

    // Force full page reload with cache busting
    window.location.href = '/?logout=' + Date.now();

  } catch (error) {
    console.error('Logout error:', error);
    
    // Emergency fallback - brute force cleanup
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;' + 
        'expires=Thu, 01 Jan 1970 00:00:00 GMT;' + 
        'path=/;' + 
        'domain=indiebasket.onrender.com;' +
        'secure;' +
        'samesite=none';
    });
    
    window.location.href = '/';
  }
};

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          !user || user.role === 'customer' ? (
            <CartProvider user={user}>
              <CustomerLayout user={user} onLogout={handleLogout}>
                <LandingPage />
              </CustomerLayout>
            </CartProvider>
          ) : (
            <Navigate to={`/${user.role}`} replace />
          )
        } />

        <Route path="/products" element={
          <CartProvider user={user}>
            <CustomerLayout user={user} onLogout={handleLogout}>
              <ProductsPage user={user} />
            </CustomerLayout>
          </CartProvider>
        } />

        <Route path="/cart" element={
          user?.role === 'customer' ? (
            <CartProvider user={user}>
              <CustomerLayout user={user} onLogout={handleLogout}>
                <CartPage />
              </CustomerLayout>
            </CartProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/addresses" element={
          user?.role === 'customer' ? (
            <CartProvider user={user}>
              <CustomerLayout user={user} onLogout={handleLogout}>
                <AddressManagementPage 
                  user={user} 
                  onAddressUpdate={(updatedUser) => setUser(updatedUser)} 
                />
              </CustomerLayout>
            </CartProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/addresses/new" element={
          user?.role === 'customer' ? (
            <CartProvider user={user}>
              <CustomerLayout user={user} onLogout={handleLogout}>
                <AddAddressPage 
                  user={user} 
                  onAddressUpdate={(updatedUser) => setUser(updatedUser)} 
                />
              </CustomerLayout>
            </CartProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/addresses/edit/:id" element={
          user?.role === 'customer' ? (
            <CartProvider user={user}>
              <CustomerLayout user={user} onLogout={handleLogout}>
                <EditAddressPage 
                  user={user} 
                  onAddressUpdate={(updatedUser) => setUser(updatedUser)} 
                />
              </CustomerLayout>
            </CartProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      <Route path="/checkout" element={
        user?.role === 'customer' ? (
          <CartProvider user={user}>
            <CustomerLayout user={user} onLogout={handleLogout}>
              <CheckoutPage />
            </CustomerLayout>
          </CartProvider>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      <Route path="/orders" element={
        user?.role === 'customer' ? (
          <CartProvider user={user}>
            <CustomerLayout user={user} onLogout={handleLogout}>
              <OrdersPage />
            </CustomerLayout>
          </CartProvider>
        ) : (
          <Navigate to="/login" replace />
        )
      } />

        <Route path="/orders/:id" element={
          user?.role === 'customer' ? (
            <CartProvider user={user}>
              <CustomerLayout user={user} onLogout={handleLogout}>
                <OrderDetailsPage  />
              </CustomerLayout>
            </CartProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/login" element={
          user ? (
            <Navigate to={
              user.role === 'admin' ? '/admin' : 
              user.role === 'delivery' ? '/delivery' : 
              '/'
            } replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        } />
        
        <Route path="/signup" element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <SignupPage onLogin={handleLogin}/>
          )
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <RoleRoute user={user} role="admin">
            <AdminDashboard user={user} onLogout={handleLogout} />
          </RoleRoute>
        } />

        {/* Delivery Routes */}
        <Route path="/delivery/*" element={
          <RoleRoute user={user} role="delivery">
            <DeliveryDashboard user={user} onLogout={handleLogout} />
          </RoleRoute>
        } />

        {/* Catch-all Route */}
        <Route path="*" element={
          user ? (
            <Navigate to={`/${user.role}`} replace />
          ) : (
            <Navigate to="/" replace />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
