import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AddressForm from '../../components/address/AddressForm';
import './AddressPage.css';

const EditAddressPage = ({ user, onAddressUpdate }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [address, setAddress] = useState(null);

  useEffect(() => {
    const foundAddress = user.addresses.find(addr => addr._id === id);
    if (!foundAddress) {
      navigate('/addresses');
      return;
    }
    setAddress(foundAddress);
  }, [id, user.addresses, navigate]);

  const handleSubmit = async (addressData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/addresses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(addressData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update address');
      }

      onAddressUpdate({ ...user, addresses: data.addresses });
      navigate('/addresses');
    } catch (err) {
      console.error('Error updating address:', err);
    }
  };

  if (!address) return <div>Loading...</div>;

  return (
    <div className="address-page">
      <AddressForm 
        initialData={address}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/addresses')}
        isEditing={true}
      />
    </div>
  );
};

export default EditAddressPage;