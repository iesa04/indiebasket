import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignupPage.css';

const SignupPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    addresses: [{
      label: 'home',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: true
    }]
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        addresses: [{
          ...prev.addresses[0],
          [addressField]: value
        }]
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include' // This is crucial for sessions
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }
      
      // Verify the response contains user data
      if (!result.user) {
        throw new Error('Registration succeeded but no user data returned');
      }
      
      // Update application state
      if (typeof onLogin === 'function') {
        onLogin(result.user);
      }
      
      // Redirect
      navigate(result.user.role === 'customer' ? '/' : `/${result.user.role}`);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="signup-container">
      <form onSubmit={handleSubmit} className="signup-form">
        <h2>Create Your Account</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-section">
          <h3>Personal Information</h3>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Home Address</h3>
          <input
            type="hidden"
            name="addresses.0.label"
            value="home"
          />
          <input
            type="hidden"
            name="addresses.0.isDefault"
            value={true}
          />
          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              name="address.street"
              value={formData.addresses[0].street}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="address.city"
              value={formData.addresses[0].city}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="address.state"
              value={formData.addresses[0].state}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Postal Code</label>
            <input
              type="text"
              name="address.postalCode"
              value={formData.addresses[0].postalCode}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              name="address.country"
              value={formData.addresses[0].country}
              onChange={handleChange}
              required
              disabled
            />
          </div>
        </div>
        
        <button type="submit" disabled={loading} className="signup-button">
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        
        <div className="auth-links">
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </form>
    </div>
  );
};

export default SignupPage;