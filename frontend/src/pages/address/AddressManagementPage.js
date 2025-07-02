import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AddressManagementPage.css';

const AddressManagementPage = ({ user, onAddressUpdate }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Only load if we have a user and addresses aren't already loaded
    if (user && !addresses.length && user.addresses) {
      setAddresses(user.addresses);
    } else if (user && !user.addresses) {
      // If user exists but addresses aren't loaded yet
      setIsLoading(true);
      // Simulate loading addresses (replace with actual API call if needed)
      const timer = setTimeout(() => {
        setAddresses([]);
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, addresses.length]);

  const handleSetDefault = async (addressId) => {
    try {
      setError('');
      const response = await fetch(`https://indiebasket.onrender.com/api/addresses/${addressId}/default`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set default address');
      }

      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr._id === addressId
      }));

      setAddresses(updatedAddresses);
      onAddressUpdate({ ...user, addresses: updatedAddresses });
    } catch (err) {
      setError(err.message);
      console.error('Set default error:', err);
    }
  };

  const handleDelete = async (addressId) => {
    const addressToDelete = addresses.find(addr => addr._id === addressId);
    
    if (addressToDelete.label === 'home') {
      setError('Cannot delete home address');
      return;
    }
    
    if (addressToDelete.isDefault) {
      setError('Please set another address as default before deleting this one');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      setError('');
      const response = await fetch(`https://indiebasket.onrender.com/api/addresses/${addressId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete address');
      }

      const remainingAddresses = addresses.filter(addr => addr._id !== addressId);
      
      if (remainingAddresses.length > 0 && !remainingAddresses.some(addr => addr.isDefault)) {
        remainingAddresses[0].isDefault = true;
      }

      setAddresses(remainingAddresses);
      onAddressUpdate({ ...user, addresses: remainingAddresses });
    } catch (err) {
      setError(err.message);
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="address-management">
      <div className="address-header">
        <h2>Manage Your Addresses</h2>
        <Link to="/addresses/new" className="btn btn-primary">
          + Add New Address
        </Link>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-btn">
            &times;
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-message">
          <p>Loading your addresses...</p>
        </div>
      ) : (
        <div className="address-list">
          {addresses.length > 0 ? (
            addresses.map(address => (
              <AddressCard
                key={address._id}
                address={address}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="no-addresses">
              <p>You haven't saved any addresses yet.</p>
              <Link to="/addresses/new" className="btn btn-primary">
                Add Your First Address
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AddressCard = ({ address, onSetDefault, onDelete }) => (
  <div className={`address-card ${address.isDefault ? 'default' : ''}`}>
    <div className="address-content">
      <div className="address-header">
        <h3 className="address-label">
          {address.label.charAt(0).toUpperCase() + address.label.slice(1)}
        </h3>
        {address.isDefault && <span className="default-badge">Default</span>}
      </div>
      <div className="address-details">
        <p>{address.street}</p>
        <p>{address.city}, {address.state} {address.postalCode}</p>
        <p>{address.country}</p>
      </div>
    </div>
    <div className="address-actions">
      <Link 
        to={`/addresses/edit/${address._id}`} 
        className="btn btn-small btn-secondary"
      >
        Edit
      </Link>
      <button 
        onClick={() => onDelete(address._id)}
        className={`btn btn-small btn-danger ${
          (address.label === 'home' || address.isDefault) ? 'disabled' : ''
        }`}
        disabled={address.label === 'home' || address.isDefault}
        title={
          address.label === 'home' ? "Cannot delete home address" :
          address.isDefault ? "Set another address as default first" : ""
        }
      >
        Delete
      </button>
      {!address.isDefault && (
        <button 
          onClick={() => onSetDefault(address._id)}
          className="btn btn-small btn-primary"
        >
          Set as Default
        </button>
      )}
    </div>
  </div>
);

export default AddressManagementPage;