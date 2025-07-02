// src/components/admin/CategoryManagement.js
import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './CategoryManagement.css'; // Create this CSS file

Modal.setAppElement('#root');

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    image: '',
    description: '',
    isActive: true
  });
  const [currentCategory, setCurrentCategory] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setError(null);
  };

  const openEditModal = (category) => {
    setCurrentCategory(category);
    setIsEditModalOpen(true);
    setError(null);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setNewCategory({
      name: '',
      image: '',
      description: '',
      isActive: true
    });
    setCurrentCategory(null);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newCategory)
      });
      if (!response.ok) throw new Error('Failed to create category');
      const createdCategory = await response.json();
      setCategories([...categories, createdCategory]);
      closeModals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/categories/${currentCategory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(currentCategory)
      });
      if (!response.ok) throw new Error('Failed to update category');
      setCategories(categories.map(c => c._id === currentCategory._id ? currentCategory : c));
      closeModals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const category = categories.find(c => c._id === id);
      const response = await fetch(`http://localhost:5000/api/categories/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !category.isActive })
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedCategory = await response.json();
      setCategories(categories.map(c => c._id === id ? updatedCategory : c));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="category-management-container">
      <div className="header-section">
        <h2>Category Management</h2>
        <button onClick={openCreateModal} className="add-category-btn">
          + Add New Category
        </button>
      </div>

      <div className="categories-table-container">
        <table className="categories-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category._id}>
                <td>{category.name}</td>
                <td>
                  <span className={`status-badge ${category.isActive ? 'active' : 'inactive'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => openEditModal(category)} 
                    className="action-btn edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(category._id)} 
                    className={`action-btn ${category.isActive ? 'deactivate' : 'activate'}`}
                  >
                    {category.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Category Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onRequestClose={closeModals}
        className="category-modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Create New Category</h3>
          <button onClick={closeModals} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleCreateCategory} className="category-form">
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Image URL:</label>
            <input 
              type="text" 
              value={newCategory.image}
              onChange={(e) => setNewCategory({...newCategory, image: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newCategory.description}
              onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
            />
          </div>
          
          <div className="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={newCategory.isActive}
                onChange={(e) => setNewCategory({...newCategory, isActive: e.target.checked})}
              />
              Active
            </label>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={closeModals} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Create Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeModals}
        className="category-modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Edit Category</h3>
          <button onClick={closeModals} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        {currentCategory && (
          <form onSubmit={handleUpdateCategory} className="category-form">
            <div className="form-group">
              <label>Name:</label>
              <input 
                type="text" 
                value={currentCategory.name}
                onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Image URL:</label>
              <input 
                type="text" 
                value={currentCategory.image}
                onChange={(e) => setCurrentCategory({...currentCategory, image: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={currentCategory.description}
                onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={currentCategory.isActive}
                  onChange={(e) => setCurrentCategory({...currentCategory, isActive: e.target.checked})}
                />
                Active
              </label>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={closeModals} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="submit-btn">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default CategoryManagement;