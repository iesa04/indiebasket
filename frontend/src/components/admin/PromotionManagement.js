import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './PromotionManagement.css';

Modal.setAppElement('#root');

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState(null);
  const [newPromotion, setNewPromotion] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscountAmount: null,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    usageType: 'general',
    maxTotalUses: null,
    maxUsesPerUser: null,
    isActive: true
  });

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const response = await fetch('https://indiebasket.onrender.com/api/promotions', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch promotions');
        const data = await response.json();
        setPromotions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, []);

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setError(null);
  };

  const openEditModal = (promotion) => {
    setCurrentPromotion({
      ...promotion,
      validFrom: promotion.validFrom.split('T')[0],
      validTo: promotion.validTo ? promotion.validTo.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
    setError(null);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setNewPromotion({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderValue: 0,
      maxDiscountAmount: null,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '',
      usageType: 'general',
      maxTotalUses: null,
      maxUsesPerUser: null,
      isActive: true
    });
    setCurrentPromotion(null);
  };

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://indiebasket.onrender.com/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newPromotion)
      });
      if (!response.ok) throw new Error('Failed to create promotion');
      const createdPromotion = await response.json();
      setPromotions([...promotions, createdPromotion]);
      closeModals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePromotion = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`https://indiebasket.onrender.com/api/promotions/${currentPromotion._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(currentPromotion)
      });
      if (!response.ok) throw new Error('Failed to update promotion');
      const updatedPromotion = await response.json();
      setPromotions(promotions.map(p => p._id === currentPromotion._id ? updatedPromotion : p));
      closeModals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const promotion = promotions.find(p => p._id === id);
      const response = await fetch(`https://indiebasket.onrender.com/api/promotions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !promotion.isActive })
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedPromotion = await response.json();
      setPromotions(promotions.map(p => p._id === id ? updatedPromotion : p));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="promotion-management-container">
      <div className="header-section">
        <h2>Promotion Management</h2>
        <button onClick={openCreateModal} className="add-promotion-btn">
          + Add New Promotion
        </button>
      </div>

      <div className="promotions-table-container">
        <table className="promotions-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Discount</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map(promotion => (
              <tr key={promotion._id}>
                <td>{promotion.code}</td>
                <td>{promotion.name}</td>
                <td>
                  {promotion.discountType === 'percentage' ? 
                    `${promotion.discountValue}%` : 
                    `₹${promotion.discountValue.toFixed(2)}`}
                  {promotion.maxDiscountAmount && promotion.discountType === 'percentage' && (
                    <small> (max ₹{promotion.maxDiscountAmount.toFixed(2)})</small>
                  )}
                </td>
                <td>
                  {promotion.validTo ? new Date(promotion.validTo).toLocaleDateString() : 'No expiry'}
                </td>
                <td>
                  <span className={`status-badge ${promotion.isActive ? 'active' : 'inactive'}`}>
                    {promotion.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => openEditModal(promotion)} 
                    className="action-btn edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(promotion._id)} 
                    className={`action-btn ${promotion.isActive ? 'deactivate' : 'activate'}`}
                  >
                    {promotion.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Promotion Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onRequestClose={closeModals}
        className="promotion-modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Create New Promotion</h3>
          <button onClick={closeModals} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleCreatePromotion} className="promotion-form">
          <div className="form-row">
            <div className="form-group">
              <label>Code *</label>
              <input 
                type="text" 
                value={newPromotion.code}
                onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value.toUpperCase()})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Name *</label>
              <input 
                type="text" 
                value={newPromotion.name}
                onChange={(e) => setNewPromotion({...newPromotion, name: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newPromotion.description}
              onChange={(e) => setNewPromotion({...newPromotion, description: e.target.value})}
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Discount Type *</label>
              <select
                value={newPromotion.discountType}
                onChange={(e) => setNewPromotion({...newPromotion, discountType: e.target.value})}
                required
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Discount Value *</label>
              <input 
                type="number" 
                value={newPromotion.discountValue}
                onChange={(e) => setNewPromotion({...newPromotion, discountValue: parseFloat(e.target.value)})}
                min="0"
                step={newPromotion.discountType === 'percentage' ? '1' : '0.01'}
                required
              />
            </div>
            
            {newPromotion.discountType === 'percentage' && (
              <div className="form-group">
                <label>Max Discount Amount (₹)</label>
                <input 
                  type="number" 
                  value={newPromotion.maxDiscountAmount || ''}
                  onChange={(e) => setNewPromotion({
                    ...newPromotion, 
                    maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Minimum Order Value (₹)</label>
              <input 
                type="number" 
                value={newPromotion.minOrderValue}
                onChange={(e) => setNewPromotion({...newPromotion, minOrderValue: parseFloat(e.target.value)})}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Valid From *</label>
              <input 
                type="date" 
                value={newPromotion.validFrom}
                onChange={(e) => setNewPromotion({...newPromotion, validFrom: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Valid To</label>
              <input 
                type="date" 
                value={newPromotion.validTo}
                onChange={(e) => setNewPromotion({...newPromotion, validTo: e.target.value})}
                min={newPromotion.validFrom}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Usage Type *</label>
              <select
                value={newPromotion.usageType}
                onChange={(e) => setNewPromotion({...newPromotion, usageType: e.target.value})}
                required
              >
                <option value="general">General</option>
                <option value="single-use">Single Use</option>
                <option value="multi-use">Multi Use</option>
              </select>
            </div>
            
            {newPromotion.usageType !== 'general' && (
              <div className="form-group">
                <label>Max Total Uses</label>
                <input 
                  type="number" 
                  value={newPromotion.maxTotalUses || ''}
                  onChange={(e) => setNewPromotion({
                    ...newPromotion, 
                    maxTotalUses: e.target.value ? parseInt(e.target.value) : null
                  })}
                  min="1"
                />
              </div>
            )}
            
            {newPromotion.usageType === 'multi-use' && (
              <div className="form-group">
                <label>Max Uses Per User</label>
                <input 
                  type="number" 
                  value={newPromotion.maxUsesPerUser || ''}
                  onChange={(e) => setNewPromotion({
                    ...newPromotion, 
                    maxUsesPerUser: e.target.value ? parseInt(e.target.value) : null
                  })}
                  min="1"
                />
              </div>
            )}
          </div>
          
          <div className="form-group checkbox">
            <label>
              <input 
                type="checkbox" 
                checked={newPromotion.isActive}
                onChange={(e) => setNewPromotion({...newPromotion, isActive: e.target.checked})}
              />
              Active
            </label>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={closeModals} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Create Promotion
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Promotion Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeModals}
        className="promotion-modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Edit Promotion</h3>
          <button onClick={closeModals} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        {currentPromotion && (
          <form onSubmit={handleUpdatePromotion} className="promotion-form">
            <div className="form-row">
              <div className="form-group">
                <label>Code *</label>
                <input 
                  type="text" 
                  value={currentPromotion.code}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, code: e.target.value.toUpperCase()})}
                  required
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label>Name *</label>
                <input 
                  type="text" 
                  value={currentPromotion.name}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, name: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={currentPromotion.description}
                onChange={(e) => setCurrentPromotion({...currentPromotion, description: e.target.value})}
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Discount Type *</label>
                <select
                  value={currentPromotion.discountType}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, discountType: e.target.value})}
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Discount Value *</label>
                <input 
                  type="number" 
                  value={currentPromotion.discountValue}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, discountValue: parseFloat(e.target.value)})}
                  min="0"
                  step={currentPromotion.discountType === 'percentage' ? '1' : '0.01'}
                  required
                />
              </div>
              
              {currentPromotion.discountType === 'percentage' && (
                <div className="form-group">
                  <label>Max Discount Amount (₹)</label>
                  <input 
                    type="number" 
                    value={currentPromotion.maxDiscountAmount || ''}
                    onChange={(e) => setCurrentPromotion({
                      ...currentPromotion, 
                      maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Minimum Order Value (₹)</label>
                <input 
                  type="number" 
                  value={currentPromotion.minOrderValue}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, minOrderValue: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Valid From *</label>
                <input 
                  type="date" 
                  value={currentPromotion.validFrom}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, validFrom: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Valid To</label>
                <input 
                  type="date" 
                  value={currentPromotion.validTo}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, validTo: e.target.value})}
                  min={currentPromotion.validFrom}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Usage Type *</label>
                <select
                  value={currentPromotion.usageType}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, usageType: e.target.value})}
                  required
                >
                  <option value="general">General</option>
                  <option value="single-use">Single Use</option>
                  <option value="multi-use">Multi Use</option>
                </select>
              </div>
              
              {currentPromotion.usageType !== 'general' && (
                <div className="form-group">
                  <label>Max Total Uses</label>
                  <input 
                    type="number" 
                    value={currentPromotion.maxTotalUses || ''}
                    onChange={(e) => setCurrentPromotion({
                      ...currentPromotion, 
                      maxTotalUses: e.target.value ? parseInt(e.target.value) : null
                    })}
                    min="1"
                  />
                </div>
              )}
              
              {currentPromotion.usageType === 'multi-use' && (
                <div className="form-group">
                  <label>Max Uses Per User</label>
                  <input 
                    type="number" 
                    value={currentPromotion.maxUsesPerUser || ''}
                    onChange={(e) => setCurrentPromotion({
                      ...currentPromotion, 
                      maxUsesPerUser: e.target.value ? parseInt(e.target.value) : null
                    })}
                    min="1"
                  />
                </div>
              )}
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={currentPromotion.isActive}
                  onChange={(e) => setCurrentPromotion({...currentPromotion, isActive: e.target.checked})}
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

export default PromotionManagement;