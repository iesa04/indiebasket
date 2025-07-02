import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddressForm from '../../components/address/AddressForm';
import './AddressPage.css';

const AddAddressPage = ({ user, onAddressUpdate }) => {
  const navigate = useNavigate();

  const handleSubmit = async (addressData) => {
    try {
      const response = await fetch('http://localhost:5000/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(addressData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add address');
      }

      onAddressUpdate({ ...user, addresses: data.addresses });
      navigate('/addresses');
    } catch (err) {
      console.error('Error adding address:', err);
    }
  };

  return (
    <div className="address-page">
      <AddressForm 
        onSubmit={handleSubmit}
        onCancel={() => navigate('/addresses')}
      />
    </div>
  );
};

export default AddAddressPage;