import './Footer.css';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
            <div className="footer-grid">
                <div className="footer-section">
                <h3>IndieBasket</h3>
                <p>Fresh groceries delivered to your doorstep</p>
                </div>
                <div className="footer-section">
                <h4>Quick Links</h4>
                <ul>
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/products">Products</Link></li>
                </ul>

                </div>
                <div className="footer-section">
                <h4>Contact Us</h4>
                <p>Email: info@indiebasket.com</p>
                <p>Phone: +91 9876543210</p>
                </div>
            </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} IndieBasket. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;