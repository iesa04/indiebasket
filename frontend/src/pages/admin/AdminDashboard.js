// src/pages/AdminDashboard.js
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import UserManagement from '../../components/admin/UserManagement';
import CategoryManagement from '../../components/admin/CategoryManagement';
import ProductManagement from '../../components/admin/ProductManagement';
import PromotionManagement from '../../components/admin/PromotionManagement';
import OrderManagement from '../../components/admin/OrderManagement';
import { FaUsers, FaBoxes, FaTags, FaShoppingCart, FaChartLine } from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    categories: 0,
    orders: 0,
    promotions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const responses = await Promise.all([
          fetch('https://indiebasket.onrender.com/api/users/count', { credentials: 'include' }),
          fetch('https://indiebasket.onrender.com/api/products/count', { credentials: 'include' }),
          fetch('https://indiebasket.onrender.com/api/categories/count', { credentials: 'include' }),
          fetch('https://indiebasket.onrender.com/api/admin/orders/count', { credentials: 'include' }),
          fetch('https://indiebasket.onrender.com/api/promotions/count', { credentials: 'include' })
        ]);

        const data = await Promise.all(responses.map(res => res.json()));
        
        setStats({
          users: data[0].count,
          products: data[1].count,
          categories: data[2].count,
          orders: data[3].count,
          promotions: data[4].count
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-nav">
          <button onClick={() => navigate('/admin')}>
            <FaChartLine className="nav-icon" /> Dashboard
          </button>
          <button onClick={() => navigate('/admin/users')}>
            <FaUsers className="nav-icon" /> Users
          </button>
          <button onClick={() => navigate('/admin/categories')}>
            <FaTags className="nav-icon" /> Categories
          </button>
          <button onClick={() => navigate('/admin/products')}>
            <FaBoxes className="nav-icon" /> Products
          </button>
          <button onClick={() => navigate('/admin/promotions')}>
            <FaTags className="nav-icon" /> Promotions
          </button>
          <button onClick={() => navigate('/admin/orders')}>
            <FaShoppingCart className="nav-icon" /> Orders
          </button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="admin-content">
        <Routes>
          <Route index element={<AdminHome stats={stats} loading={loading} />} />
          <Route path="users/*" element={<UserManagement />} />
          <Route path="categories/*" element={<CategoryManagement />} />
          <Route path="products/*" element={<ProductManagement />} />
          <Route path="promotions/*" element={<PromotionManagement />} />
          <Route path="orders/*" element={<OrderManagement />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const AdminHome = ({ stats, loading }) => {
  return (
    <div className="admin-home">
      <h2>Dashboard Overview</h2>
      
      {loading ? (
        <div className="loading-spinner">Loading statistics...</div>
      ) : (
        <div className="stats-grid">
          <StatCard 
            title="Total Users" 
            value={stats.users} 
            icon={<FaUsers />}
            color="#3498db"
            path="/admin/users"
          />
          <StatCard 
            title="Total Products" 
            value={stats.products} 
            icon={<FaBoxes />}
            color="#2ecc71"
            path="/admin/products"
          />
          <StatCard 
            title="Categories" 
            value={stats.categories} 
            icon={<FaTags />}
            color="#e74c3c"
            path="/admin/categories"
          />
          <StatCard 
            title="Active Orders" 
            value={stats.orders} 
            icon={<FaShoppingCart />}
            color="#f39c12"
            path="/admin/orders"
          />
          <StatCard 
            title="Promotions" 
            value={stats.promotions} 
            icon={<FaTags />}
            color="#9b59b6"
            path="/admin/promotions"
          />
        </div>
      )}

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        {/* You can add recent activity logs here */}
        <div className="activity-placeholder">
          Activity feed will be displayed here
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, path }) => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="stat-card" 
      style={{ borderTop: `4px solid ${color}` }}
      onClick={() => navigate(path)}
    >
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;