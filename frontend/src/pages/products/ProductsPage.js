import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Trash2, Plus, Minus } from 'lucide-react';
import './ProductsPage.css';
import ProductModal from '../../components/products/ProductModal';

const ProductsPage = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingItems, setProcessingItems] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [localCart, setLocalCart] = useState({ items: [] });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const navigate = useNavigate();
  const {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    refreshCart
  } = useCart();

  // Sync localCart whenever context cart changes
  useEffect(() => {
    if (cart && Array.isArray(cart.items)) {
      setLocalCart(cart);
    }
  }, [cart]);

  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:5000/api/public/products'),
          fetch('http://localhost:5000/api/categories')
        ]);

        if (!productsRes.ok || !categoriesRes.ok)
          throw new Error('Failed to fetch data');

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();

        setProducts(productsData);
        setCategories(categoriesData);
        setFilteredProducts(productsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter products
  useEffect(() => {
    let result = [...products];

    if (selectedCategory) {
      result = result.filter(product =>
        product.category && (product.category._id === selectedCategory || product.category === selectedCategory)
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.name.toLowerCase().includes(term) ||
        (product.description && product.description.toLowerCase().includes(term))
      );
    }

    setFilteredProducts(result);
  }, [selectedCategory, searchTerm, products]);

  const getLiveDiscountedPrice = (product) => {
    if (!product.discount) return product.price;
    const { discountType, value, expiresAt } = product.discount;
    const isValid = !expiresAt || new Date(expiresAt) > new Date();
    return isValid
      ? discountType === 'percentage'
        ? product.price * (1 - value / 100)
        : product.price - value
      : product.price;
  };

  const handleAction = async (action, productId, quantity = 1) => {
    if (!user) {
      navigate('/login', { state: { from: '/products' } });
      return;
    }

    setProcessingItems(prev => ({ ...prev, [productId]: true }));

    const existingItem = localCart.items.find(item => {
      const id = typeof item.product === 'object' ? item.product._id : item.product;
      return id === productId;
    });

    let updatedItems = [...localCart.items];
    if (action === 'add') {
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        updatedItems.push({ product: productId, quantity });
      }
    } else if (action === 'update') {
      if (existingItem) {
        existingItem.quantity = quantity;
      } else {
        updatedItems.push({ product: productId, quantity });
      }
    } else if (action === 'remove') {
      updatedItems = updatedItems.filter(item => {
        const id = typeof item.product === 'object' ? item.product._id : item.product;
        return id !== productId;
      });
    }

    setLocalCart({ ...localCart, items: updatedItems });

    try {
      let result;
      if (action === 'add') {
        result = await addToCart(productId, quantity);
      } else if (action === 'update') {
        result = existingItem
          ? await updateCartItem(existingItem._id, quantity)
          : await addToCart(productId, quantity);
      } else if (action === 'remove') {
        result = existingItem && await removeFromCart(existingItem._id);
      }

      if (!result?.success) throw new Error(result?.message);

      setIsSyncing(true);
      await refreshCart(); // This updates the real cart
      setIsSyncing(false);
    } catch (err) {
      console.error('Cart sync failed:', err);
      setIsSyncing(true);
      await refreshCart(); // Re-sync on failure
      setIsSyncing(false);
    } finally {
      setProcessingItems(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) return(
      <div className="spinner-container">
        <div className="loading-spinner"></div>
    </div>
  );
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="products-page">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="products-container">
        <div className="categories-sidebar">
          <h3>Categories</h3>
          <ul>
            <li
              className={!selectedCategory ? 'active' : ''}
              onClick={() => setSelectedCategory(null)}
            >
              All Products
            </li>
            {categories.filter(c => c.isActive).map(category => (
              <li
                key={category._id}
                className={selectedCategory === category._id ? 'active' : ''}
                onClick={() => setSelectedCategory(category._id)}
              >
                {category.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => {
              const cartItem = localCart?.items?.find(item => {
                const id = typeof item.product === 'object' ? item.product._id : item.product;
                return id === product._id;
              });

              const quantity = cartItem?.quantity || 0;
              const isLoading = processingItems[product._id];
              const discountedPrice = getLiveDiscountedPrice(product);

              return (
                <div key={product._id} className="product-card">
                  <div
                    className="product-image-container"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.images?.length ? (
                      <img src={product.images[0]} alt={product.name} className="product-image" />
                    ) : (
                      <div className="image-placeholder">No Image</div>
                    )}
                    {product.discount && product.discount.value > 0 && (
                      <div className="product-discount-badge">
                        {product.discount.discountType === 'percentage'
                          ? `${product.discount.value}% OFF`
                          : `₹${product.discount.value} OFF`}
                      </div>
                    )}
                  </div>

                  <div className="product-info">
                    <h3
                      className="product-name"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.name}
                    </h3>

                    <div className="product-pricing">
                      {discountedPrice < product.price ? (
                        <>
                          <span className="product-price discounted">₹{discountedPrice.toFixed(2)}</span>
                          <span className="product-price original">₹{product.price.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="product-price">₹{product.price.toFixed(2)}</span>
                      )}
                      <span className="product-unit">{product.unit || 'Each'}</span>
                    </div>

                    {quantity > 0 ? (
                      <div className="quantity-controls">
                        {quantity > 1 ? (
                          <button
                            onClick={() => handleAction('update', product._id, quantity - 1)}
                            disabled={isLoading || isSyncing}
                            className="quantity-btn"
                          >
                            <Minus size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('remove', product._id)}
                            disabled={isLoading || isSyncing}
                            className="quantity-btn delete-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <span className="quantity-display">{quantity}</span>
                        <button
                          onClick={() => handleAction('update', product._id, quantity + 1)}
                          disabled={isLoading || isSyncing || quantity >= product.stock}
                          className="quantity-btn"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAction('add', product._id, 1)}
                        className={`add-to-cart-btn ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                        disabled={isLoading || isSyncing || product.stock <= 0}
                      >
                        {isLoading ? 'Processing...' : product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-products">
              No products found
              {selectedCategory && (
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => setSelectedCategory(null)}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
};

export default ProductsPage;
