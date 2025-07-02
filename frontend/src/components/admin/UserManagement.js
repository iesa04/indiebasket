// src/components/admin/UserManagement.js
import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './UserManagement.css'; // Create this CSS file

Modal.setAppElement('#root'); // For accessibility

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('https://indiebasket.onrender.com/api/users', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://indiebasket.onrender.com/api/users/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser)
      });
      if (!response.ok) throw new Error('Failed to create user');
      const createdUser = await response.json();
      setUsers([...users, createdUser]);
      setNewUser({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'customer'
      });
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewUser({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'customer'
    });
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="user-management-container">
      <div className="header-section">
        <h2>User Management</h2>
        <button onClick={openModal} className="add-user-btn">
          + Add New User
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.phone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="user-modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Create New User</h3>
          <button onClick={closeModal} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleCreateUser} className="user-form">
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email:</label>
            <input 
              type="email" 
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password:</label>
            <input 
              type="password" 
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Phone:</label>
            <input 
              type="tel" 
              value={newUser.phone}
              onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Role:</label>
            <select 
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="admin">Admin</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={closeModal} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;