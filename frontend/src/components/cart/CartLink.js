// components/CartLink.jsx
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ShoppingCart } from 'lucide-react';
import { memo } from 'react';
import './CartLink.css'; // You'll create this

const CartLink = () => {
  const { cart } = useCart();
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Link to="/cart" className="cart-icon-link">
      <ShoppingCart size={22} />
      {cartItemCount > 0 && (
        <span className="cart-count-badge">{cartItemCount}</span>
      )}
    </Link>
  );
};

export default memo(CartLink);
