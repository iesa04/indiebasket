import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Fresh Groceries Delivered</h1>
          <p>From local farms to your doorstep</p>
        </div>
      </div>

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose IndieBasket?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🚚</div>
              <h3>Fast Delivery</h3>
              <p>Get your orders in under 2 hours</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>Farm Fresh</h3>
              <p>Locally sourced produce</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💚</div>
              <h3>Eco-Friendly</h3>
              <p>Sustainable packaging</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;