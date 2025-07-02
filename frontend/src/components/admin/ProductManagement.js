import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './ProductManagement.css';

Modal.setAppElement('#root');

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    stock: 0,
    images: [],
    isAvailable: true,
    isPromotionEligible: true,
    unit: '',
    brand: '',
    discount: {
      discountType: 'percentage',
      value: 0,
      expiresAt: ''
    }
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [stockAdjustment, setStockAdjustment] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:5000/api/products', { credentials: 'include' }),
          fetch('http://localhost:5000/api/categories')
        ]);
        
        if (!productsRes.ok || !categoriesRes.ok) throw new Error('Failed to fetch data');
        
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setError(null);
  };

  const openEditModal = (product) => {
    setCurrentProduct({
      ...product,
      category: product.category._id || product.category,
      discount: product.discount || {
        discountType: 'percentage',
        value: 0,
        expiresAt: ''
      }
    });
    setIsEditModalOpen(true);
    setError(null);
    setStockAdjustment(0);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setNewProduct({
      name: '',
      description: '',
      category: '',
      price: 0,
      stock: 0,
      images: [],
      isAvailable: true,
      isPromotionEligible: true,
      unit: '',
      brand: '',
      discount: {
        discountType: 'percentage',
        value: 0,
        expiresAt: ''
      }
    });
    setCurrentProduct(null);
    setNewImageUrl('');
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...newProduct,
        discount: newProduct.discount
      };

      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) throw new Error('Failed to create product');
      const createdProduct = await response.json();
      setProducts([...products, createdProduct]);
      closeModals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const updatedProduct = {
        ...currentProduct,
        stock: currentProduct.stock + parseInt(stockAdjustment || 0),
        discount: currentProduct.discount 
      };

      const response = await fetch(`http://localhost:5000/api/products/${currentProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedProduct)
      });
      
      if (!response.ok) throw new Error('Failed to update product');
      const updatedData = await response.json();
      setProducts(products.map(p => p._id === currentProduct._id ? updatedData : p));
      closeModals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (id, field) => {
    try {
      const product = products.find(p => p._id === id);
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          [field]: !product[field],
          name: product.name,
          price: product.price,
          category: product.category._id || product.category
        })
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedProduct = await response.json();
      setProducts(products.map(p => p._id === id ? updatedProduct : p));
    } catch (err) {
      setError(err.message);
    }
  };

  const addImage = (isNewProduct) => {
    if (!newImageUrl) return;
    if (isNewProduct) {
      setNewProduct({
        ...newProduct,
        images: [...newProduct.images, newImageUrl]
      });
    } else {
      setCurrentProduct({
        ...currentProduct,
        images: [...currentProduct.images, newImageUrl]
      });
    }
    setNewImageUrl('');
  };

  const removeImage = (index, isNewProduct) => {
    if (isNewProduct) {
      setNewProduct({
        ...newProduct,
        images: newProduct.images.filter((_, i) => i !== index)
      });
    } else {
      setCurrentProduct({
        ...currentProduct,
        images: currentProduct.images.filter((_, i) => i !== index)
      });
    }
  };

  const handleDiscountChange = (field, value, isNewProduct) => {
    if (isNewProduct) {
      setNewProduct({
        ...newProduct,
        discount: {
          ...newProduct.discount,
          [field]: value
        }
      });
    } else {
      setCurrentProduct({
        ...currentProduct,
        discount: {
          ...currentProduct.discount,
          [field]: value
        }
      });
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="product-management-container">
      <div className="header-section">
        <h2>Product Management</h2>
        <button onClick={openCreateModal} className="add-product-btn">
          + Add New Product
        </button>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id}>
                <td>{product.name}</td>
                <td>{product.category?.name || 'N/A'}</td>
                <td>₹{product.price.toFixed(2)}</td>
                <td>{product.stock} {product.unit || ''}</td>
                <td>
                  <span className={`status-badge ${product.isAvailable ? 'active' : 'inactive'}`}>
                    {product.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => openEditModal(product)} 
                    className="action-btn edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(product._id, 'isAvailable')} 
                    className={`action-btn ${product.isAvailable ? 'deactivate' : 'activate'}`}
                  >
                    {product.isAvailable ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onRequestClose={closeModals}
        className="product-modal"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Create New Product</h3>
          <button onClick={closeModals} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleCreateProduct} className="product-form">
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input 
                type="text" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Price *</label>
              <input 
                type="number" 
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Stock *</label>
              <input 
                type="number" 
                value={newProduct.stock}
                onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                min="0"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Unit</label>
              <input 
                type="text" 
                value={newProduct.unit}
                onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                placeholder="kg, g, ml, etc."
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Brand</label>
            <input 
              type="text" 
              value={newProduct.brand}
              onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Images</label>
            <div className="image-input">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Enter image URL"
              />
              <button 
                type="button"
                onClick={() => addImage(true)}
                className="btn-secondary"
              >
                Add Image
              </button>
            </div>
            <div className="image-preview">
              {newProduct.images.map((image, index) => (
                <div key={index} className="image-item">
                  <img src={image} alt={`Preview ${index}`} />
                  <button
                    onClick={() => removeImage(index, true)}
                    className="btn-danger small"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Discount</label>
            <div className="discount-control">
              <select
                value={newProduct.discount.discountType}
                onChange={(e) => handleDiscountChange('discountType', e.target.value, true)}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
              <input
                type="number"
                value={newProduct.discount.value}
                onChange={(e) => handleDiscountChange('value', parseFloat(e.target.value), true)}
                min="0"
                step={newProduct.discount.discountType === 'percentage' ? '1' : '0.01'}
              />
              <input
                type="date"
                value={newProduct.discount.expiresAt}
                onChange={(e) => handleDiscountChange('expiresAt', e.target.value, true)}
                placeholder="Expiry date"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={newProduct.isAvailable}
                  onChange={(e) => setNewProduct({...newProduct, isAvailable: e.target.checked})}
                />
                Available
              </label>
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={newProduct.isPromotionEligible}
                  onChange={(e) => setNewProduct({...newProduct, isPromotionEligible: e.target.checked})}
                />
                Promotion Eligible
              </label>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={closeModals} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Create Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeModals}
        className="product-modal large"
        overlayClassName="modal-overlay"
      >
        <div className="modal-header">
          <h3>Edit Product</h3>
          <button onClick={closeModals} className="close-modal-btn">
            &times;
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        {currentProduct && (
          <form onSubmit={handleUpdateProduct} className="product-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input 
                  type="text" 
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={currentProduct.category}
                  onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={currentProduct.description}
                onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Price *</label>
                <input 
                  type="number" 
                  value={currentProduct.price}
                  onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Current Stock</label>
                <div className="stock-display">{currentProduct.stock} {currentProduct.unit || ''}</div>
              </div>
              
              <div className="form-group">
                <label>Adjust Stock</label>
                <input 
                  type="number" 
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  placeholder="Add/remove quantity"
                />
                <div className="stock-preview">
                  New total: {currentProduct.stock + parseInt(stockAdjustment || 0)}
                </div>
              </div>
              
              <div className="form-group">
                <label>Unit</label>
                <input 
                  type="text" 
                  value={currentProduct.unit}
                  onChange={(e) => setCurrentProduct({...currentProduct, unit: e.target.value})}
                  placeholder="kg, g, ml, etc."
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Brand</label>
              <input 
                type="text" 
                value={currentProduct.brand}
                onChange={(e) => setCurrentProduct({...currentProduct, brand: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Images</label>
              <div className="image-input">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                />
                <button 
                  type="button"
                  onClick={() => addImage(false)}
                  className="btn-secondary"
                >
                  Add Image
                </button>
              </div>
              <div className="image-preview">
                {currentProduct.images.map((image, index) => (
                  <div key={index} className="image-item">
                    <img src={image} alt={`Preview ${index}`} />
                    <button
                      onClick={() => removeImage(index, false)}
                      className="btn-danger small"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Discount</label>
              <div className="discount-control">
                <select
                  value={currentProduct.discount.discountType}
                  onChange={(e) => handleDiscountChange('discountType', e.target.value, false)}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                <input
                  type="number"
                  value={currentProduct.discount.value}
                  onChange={(e) => handleDiscountChange('value', parseFloat(e.target.value), false)}
                  min="0"
                  step={currentProduct.discount.discountType === 'percentage' ? '1' : '0.01'}
                />
                <input
                  type="date"
                  value={currentProduct.discount.expiresAt}
                  onChange={(e) => handleDiscountChange('expiresAt', e.target.value, false)}
                  placeholder="Expiry date"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group checkbox">
                <label>
                  <input 
                    type="checkbox" 
                    checked={currentProduct.isAvailable}
                    onChange={(e) => setCurrentProduct({...currentProduct, isAvailable: e.target.checked})}
                  />
                  Available
                </label>
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input 
                    type="checkbox" 
                    checked={currentProduct.isPromotionEligible}
                    onChange={(e) => setCurrentProduct({...currentProduct, isPromotionEligible: e.target.checked})}
                  />
                  Promotion Eligible
                </label>
              </div>
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

export default ProductManagement;