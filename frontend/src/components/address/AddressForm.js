import { useState, useEffect } from 'react';
import './AddressForm.css';

const AddressForm = ({ initialData = {}, onSubmit, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    label: 'home',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
    ...initialData
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.street || !formData.city || !formData.state || !formData.postalCode) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="address-form">
      <h3>{isEditing ? 'Edit Address' : 'Add New Address'}</h3>
      
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Address Label</label>
        <select
          name="label"
          value={formData.label}
          onChange={handleChange}
          required
        >
          <option value="home">Home</option>
          <option value="work">Work</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Street Address*</label>
        <input
          type="text"
          name="street"
          value={formData.street}
          onChange={handleChange}
          required
          placeholder="House no., Building, Street"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City*</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>State*</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Postal Code*</label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            disabled
          />
        </div>
      </div>

      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="isDefault"
          name="isDefault"
          checked={formData.isDefault}
          onChange={handleChange}
        />
        <label htmlFor="isDefault">Set as default address</label>
      </div>

      <div className="form-actions">
        <button 
          type="button" 
          onClick={onCancel} 
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;