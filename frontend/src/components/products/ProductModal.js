import { X } from 'lucide-react';
import { format } from 'date-fns';
import './ProductModal.css';

const ProductModal = ({ product, onClose }) => {
  if (!product) return null;

  const getDiscountedPrice = () => {
    const { discount, price } = product;
    if (!discount) return price;
    const isValid = !discount.expiresAt || new Date(discount.expiresAt) > new Date();
    return isValid
      ? discount.discountType === 'percentage'
        ? price * (1 - discount.value / 100)
        : price - discount.value
      : price;
  };

  const discountedPrice = getDiscountedPrice();
  const hasActiveDiscount = product.discount &&
    (!product.discount.expiresAt || new Date(product.discount.expiresAt) > new Date());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* LEFT: Image Section */}
        <div className="modal-image-side">
          {product.images?.length ? (
            <img src={product.images[0]} alt={product.name} className="modal-main-image" />
          ) : (
            <div className="modal-main-image image-placeholder">No Image</div>
          )}

          {product.images?.length > 1 && (
            <div className="modal-thumbnails">
              {product.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  className="modal-thumbnail"
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Info Section */}
        <div className="modal-info-side">
          <h2 className="modal-title">{product.name}</h2>

          {product.brand && (
            <div className="modal-brand">Brand: {product.brand}</div>
          )}

          <div className="modal-price-block">
            <span className="modal-price">₹{discountedPrice.toFixed(2)}</span>
            {hasActiveDiscount && (
              <>
                <span className="modal-original-price">₹{product.price.toFixed(2)}</span>
                <span className="modal-discount-badge">
                  {product.discount.discountType === 'percentage'
                    ? `${product.discount.value}% OFF`
                    : `₹${product.discount.value} OFF`}
                </span>
              </>
            )}
            <span className="modal-unit">({product.unit || 'Each'})</span>
          </div>

          <div className={`modal-stock ${product.stock > 0 ? 'in' : 'out'}`}>
            {product.stock > 0
              ? `In Stock (${product.stock})`
              : 'Out of Stock'}
          </div>

          <div className="modal-section">
            <h3 className="modal-section-title">Description</h3>
            <p className="modal-description">
              {product.description || 'No description available.'}
            </p>
          </div>

          <div className="modal-section">
            <h3 className="modal-section-title">Category</h3>
            <p className="modal-description">
              {product.category?.name || 'Uncategorized'}
            </p>
          </div>

          {product.discount?.expiresAt && (
            <div className="modal-section">
              <h3 className="modal-section-title">Discount Validity</h3>
              <p className="modal-description">
                Until: {format(new Date(product.discount.expiresAt), 'PPpp')}
              </p>
            </div>
          )}

          <div className="modal-section">
            <h3 className="modal-section-title">Product ID</h3>
            <p className="modal-product-id">{product._id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
