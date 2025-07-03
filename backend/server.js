require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { User, Category, Product, Cart, Order, Promotion } = require('./models/schema');

const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'https://indiebasket-frontend.onrender.com',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Utility function to handle errors
const handleError = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ success: false, message: error.message || 'Something went wrong' });
};

// Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(token).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// Admin Middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

async function recalculateCart(cart) {
  await cart.populate('items.product');

  let subtotal = 0;
  let total = 0;
  let discountTotal = 0;

  for (const item of cart.items) {
    const quantity = item.quantity;
    const original = item.priceAtAddition;
    const discounted = item.currentPrice;

    subtotal += original * quantity;
    total += discounted * quantity;
    discountTotal += (original - discounted) * quantity;
  }

  cart.subtotal = parseFloat(subtotal.toFixed(2));
  cart.total = parseFloat(total.toFixed(2));
  cart.discounts = parseFloat(discountTotal.toFixed(2));
  cart.updatedAt = new Date();
  
  await cart.save();
  return cart;
}


// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

// Auth Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, phone, addresses } = req.body;

    // Your existing validation and user creation logic
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with address
    const user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      phone,
      role: 'customer',
      addresses: addresses || []
    });

    await user.save();

    // Create cart for user
    const cart = new Cart({ user: user._id });
    await cart.save();

    user.cart = cart._id;
    await user.save();

    // Set the auth cookie (same as login)
    res.cookie('token', user._id.toString(), {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: 'none',
      secure: true
    });

    // Return user data without sensitive information
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      addresses: user.addresses,
      cart: user.cart,
      phone: user.phone
    };

    res.status(201).json({ 
      success: true, 
      message: 'User created and logged in successfully',
      user: userData
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Registration failed'
    });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.cookie('token', user._id.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
      domain: 'indiebasket.onrender.com'  // ⬅️ Add this
    });


    res.json({ 
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/api/auth', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('_id name email role phone addresses')
      .lean();
      
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!['admin', 'delivery', 'customer'].includes(user.role)) {
      return res.status(403).json({ message: 'Invalid user role' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/api/logout', (req, res) => {
  try {
    // Must match cookie options exactly as when set
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      domain: 'indiebasket.onrender.com'
    });


    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    handleError(res, error);
  }
});

// Admin Routes - User Management
app.get('/api/users', authenticate, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/users/admin', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['admin', 'delivery'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for admin creation' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ 
      name, 
      email, 
      passwordHash: hashedPassword, 
      role, 
      phone 
    });
    
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    handleError(res, error);
  }
});

// Admin Routes - Category Management
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/categories', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, image, description } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ message: 'Name and image are required' });
    }

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new Category({
      name,
      image,
      description: description || ''
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/categories/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, image, description } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ message: 'Name and image are required' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, image, description },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/categories/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    handleError(res, error);
  }
});

// Admin Routes - Product Management
app.get('/api/products', authenticate, adminOnly, async (req, res) => {
  try {
    const products = await Product.find().populate('category');
    res.json(products);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/products', authenticate, adminOnly, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      price, 
      stock, 
      images, 
      isAvailable, 
      isPromotionEligible,
      unit,
      brand
    } = req.body;
    
    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const product = new Product({
      name,
      description: description || '',
      category,
      price,
      stock,
      images: images || [],
      isAvailable: isAvailable !== false,
      isPromotionEligible: isPromotionEligible !== false,
      unit: unit || '',
      brand: brand || '',
      priceHistory: [{ price, changedAt: new Date() }]
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/products/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { price } = req.body;
    const priceChanged = price !== undefined && price !== product.price;

    const updateData = {
      ...req.body,
      priceHistory: priceChanged 
        ? [...product.priceHistory, { price, changedAt: new Date() }]
        : product.priceHistory
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category');

    res.json(updatedProduct);
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/products/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true }
    ).populate('category');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/products/:id/promo-status', authenticate, adminOnly, async (req, res) => {
  try {
    const { isPromotionEligible } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isPromotionEligible },
      { new: true }
    ).populate('category');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
});

// Admin Routes - Promotion Management
app.get('/api/promotions', authenticate, adminOnly, async (req, res) => {
  try {
    const promotions = await Promotion.find().populate('createdBy', 'name email');
    res.json(promotions);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/promotions', authenticate, adminOnly, async (req, res) => {
  try {
    const { 
      code, 
      name, 
      description, 
      discountType, 
      discountValue, 
      minOrderValue, 
      maxDiscountAmount,
      validFrom,
      validTo,
      usageType,
      maxTotalUses,
      maxUsesPerUser,
      isActive
    } = req.body;
    
    if (!code || !name || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const existingPromotion = await Promotion.findOne({ code });
    if (existingPromotion) {
      return res.status(400).json({ message: 'Promotion code already exists' });
    }

    const promotion = new Promotion({
      code: code.toUpperCase(),
      name,
      description: description || '',
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxDiscountAmount,
      validFrom: validFrom || new Date(),
      validTo,
      usageType: usageType || 'general',
      maxTotalUses,
      maxUsesPerUser,
      isActive: isActive !== false,
      createdBy: req.user._id
    });

    await promotion.save();
    res.status(201).json(promotion);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/promotions/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('createdBy', 'name email');

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    res.json(promotion);
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/promotions/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).populate('createdBy', 'name email');

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    res.json(promotion);
  } catch (error) {
    handleError(res, error);
  }
});

// Public Product Routes
app.get('/api/public/products', async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: true })
      .populate('category')
      .lean();
      
    // Calculate discounted prices
    const productsWithDiscounts = products.map(product => {
      let discountedPrice = product.price;
      let hasDiscount = false;
      
      if (
            product.discount &&
            product.discount.expiresAt &&
            !isNaN(new Date(product.discount.expiresAt)) &&
            new Date(product.discount.expiresAt) > new Date()
          )
      {
        hasDiscount = true;
        if (product.discount.discountType === 'percentage') {
          discountedPrice = product.price * (1 - (product.discount.value / 100));
        } else {
          discountedPrice = product.price - product.discount.value;
        }
        discountedPrice = Math.max(0, discountedPrice); // Ensure price doesn't go negative
      }
      
      return {
        ...product,
        discountedPrice: hasDiscount ? discountedPrice : null,
        hasDiscount
      };
    });
    
    res.json(productsWithDiscounts);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/public/products/search', async (req, res) => {
  try {
    const { query, category } = req.query;
    let searchQuery = { isAvailable: true };
    
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (category) {
      searchQuery.category = category;
    }
    
    const products = await Product.find(searchQuery)
      .populate('category')
      .limit(50)
      .lean();
      
    res.json(products);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/customer/cart', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can access cart' });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    let subtotal = 0;
    let total = 0;
    let priceChanged = false;

    for (const item of cart.items) {
      const product = item.product;
      if (!product) continue;

      const originalPrice = product.price;
      let discountedPrice = originalPrice;

      // Compute current valid discount
      if (
        product.discount &&
        (!product.discount.expiresAt || new Date(product.discount.expiresAt) > new Date())
      ) {
        const { discountType, value } = product.discount;
        if (discountType === 'percentage') {
          discountedPrice = originalPrice * (1 - value / 100);
        } else if (discountType === 'fixed') {
          discountedPrice = originalPrice - value;
        }

        discountedPrice = Math.max(0, discountedPrice);
      }

      // Compare with stored currentPrice in cart item
      const priceNow = parseFloat(discountedPrice.toFixed(2));
      const storedPrice = parseFloat(item.currentPrice.toFixed(2));

      if (priceNow !== storedPrice) {
        item.priceChanged = true;
        priceChanged = true;
      } else {
        item.priceChanged = false;
      }

      subtotal += item.priceAtAddition * item.quantity;
      total += priceNow * item.quantity;
    }

    cart.subtotal = parseFloat(subtotal.toFixed(2));
    cart.total = parseFloat(total.toFixed(2));
    cart.discounts = parseFloat((subtotal - total).toFixed(2));
    cart.lastPriceCheck = new Date();

    if (priceChanged) {
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    handleError(res, error);
  }
});



app.post('/api/customer/cart/add', authenticate, async (req, res) => {
  const { productId, quantity = 1 } = req.body;  
  const product = await Product.findById(productId);

  // calculate discountedPrice and discountApplied...
  let discounted = product.price;
  let discountApplied = null;

  if (product.discount && !expired) {
    discountApplied = { type, value };
    discounted = discountType === 'percentage'
      ? product.price * (1 - value / 100)
      : product.price - value;
    discounted = Math.max(0, discounted);
  }

  const finalPrice = Math.round(discounted * 100) / 100;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id });

  const existing = cart.items.find(i => i.product.toString() === productId);

  if (existing) {
    existing.quantity += quantity;
    existing.priceAtAddition = finalPrice;
    existing.currentPrice = finalPrice;
    existing.discountApplied = discountApplied;
    existing.priceChanged = false;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
      priceAtAddition: finalPrice,
      currentPrice: finalPrice,
      discountApplied,
      priceChanged: false,
      addedAt: new Date()
    });
  }

  await recalculateCart(cart);
  res.json({ success: true, cart });
});




app.post('/api/customer/cart', authenticate, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid product or quantity' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Calculate discounted price
    let discountedPrice = product.price;
    if (
      product.discount &&
      (!product.discount.expiresAt || new Date(product.discount.expiresAt) > new Date())
    ) {
      const { discountType, value } = product.discount;
      if (discountType === 'percentage') {
        discountedPrice = product.price * (1 - value / 100);
      } else if (discountType === 'fixed') {
        discountedPrice = product.price - value;
      }
      discountedPrice = Math.max(0, discountedPrice);
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [],
        subtotal: 0,
        discounts: 0,
        total: 0
      });
    }

    const existingItem = cart.items.find(item => item.product.equals(productId));
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        priceAtAddition: product.price, // original price (without discount)
        currentPrice: parseFloat(discountedPrice.toFixed(2)), // discounted price
        priceChanged: false,
        discountApplied: product.discount || null
      });
    }

    // Recalculate subtotal, discounts, total
    let subtotal = 0;
    let total = 0;
    for (const item of cart.items) {
      subtotal += item.priceAtAddition * item.quantity;
      total += item.currentPrice * item.quantity;
    }
    cart.subtotal = parseFloat(subtotal.toFixed(2));
    cart.total = parseFloat(total.toFixed(2));
    cart.discounts = parseFloat((subtotal - total).toFixed(2));
    cart.lastPriceCheck = new Date();

    await cart.save();
    const populatedCart = await cart.populate('items.product');
    res.status(200).json(populatedCart);
  } catch (error) {
    handleError(res, error);
  }
});


app.put('/api/customer/cart/item/:itemId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can modify cart' });
    }

    const { quantity } = req.body;
    const { itemId } = req.params;
    if (!quantity || quantity < 1 || quantity > 100) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    item.quantity = quantity;
    await recalculateCart(cart);

    res.json({ success: true, cart });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/customer/cart/item/:itemId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can remove from cart' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    item.deleteOne(); // .remove() is not a function on subdoc arrays in Mongoose 6+
    await recalculateCart(cart);

    res.json({ success: true, cart });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/customer/cart/item/:itemId/accept-price', authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const product = item.product;
    if (!product) return res.status(400).json({ message: 'Invalid product in cart' });

    // Recalculate discount
    let finalPrice = product.price;
    item.priceAtAddition = finalPrice;
    if (
      product.discount &&
      (!product.discount.expiresAt || new Date(product.discount.expiresAt) > new Date())
    ) {
      const { discountType, value } = product.discount;
      if (discountType === 'percentage') {
        finalPrice = finalPrice * (1 - value / 100);
      } else if (discountType === 'fixed') {
        finalPrice = finalPrice - value;
      }
      finalPrice = Math.max(0, finalPrice);
    }

    
    item.currentPrice = finalPrice;
    item.priceChanged = false;

    await cart.save();
    res.json(cart);
  } catch (error) {
    handleError(res, error);
  }
});


app.delete('/api/customer/cart', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can modify cart' });
    }
    
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], subtotal: 0, discounts: 0, total: 0 } },
      { new: true }
    );
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    res.json(cart);
  } catch (error) {
    handleError(res, error);
  }
});

// Get eligible promotions
app.get('/api/promotions/eligible', authenticate, async (req, res) => {
  try {
    // Get user's cart with populated products
    const user = await User.findById(req.user._id).populate({
      path: 'cart',
      populate: {
        path: 'items.product',
        model: 'Product'
      }
    });

    if (!user || !user.cart) {
      return res.status(400).json({ message: 'Cart not found' });
    }

    // Calculate sum of promo-eligible items
    const promoEligibleTotal = user.cart.items.reduce((sum, item) => {
      return item.product.isPromotionEligible 
        ? sum + (item.currentPrice * item.quantity)
        : sum;
    }, 0);

    // Find all active promotions
    const allPromotions = await Promotion.find({
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [
        { validTo: { $exists: false } },
        { validTo: { $gte: new Date() } }
      ]
    });

    // Filter promotions based on eligibility
    const eligiblePromotions = allPromotions.filter(promo => {
      // Check minimum order value for promo-eligible items
      if (promo.minOrderValue > 0 && promoEligibleTotal < promo.minOrderValue) {
        return false;
      }

      // Check usage limits
      if (promo.usageType === 'single-use') {
        return !promo.usersUsed.some(u => u.user.equals(req.user._id));
      }

      if (promo.usageType === 'multi-use' && promo.maxUsesPerUser) {
        const userUsage = promo.usersUsed.find(u => u.user.equals(req.user._id));
        return !userUsage || userUsage.count < promo.maxUsesPerUser;
      }

      return true;
    });

    res.json(eligiblePromotions);
  } catch (error) {
    handleError(res, error);
  }
});

// Add this to your backend routes
app.post('/api/cart/validate', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'cart',
      populate: {
        path: 'items.product',
        model: 'Product'
      }
    });

    if (!user || !user.cart) {
      return res.status(400).json({ message: 'Cart not found' });
    }

    // Validate prices and stock
    const issues = [];
    for (const item of user.cart.items) {
      // Check stock
      if (item.quantity > item.product.stock) {
        issues.push({
          product: item.product.name,
          issue: 'insufficient_stock',
          available: item.product.stock,
          requested: item.quantity
        });
        continue;
      }

      // Check price (you'll need to implement calculateLivePrice similar to frontend)
      const livePrice = calculateLivePrice(item.product);
      if (Math.abs(livePrice - item.currentPrice) > 0.01) {
        issues.push({
          product: item.product.name,
          issue: 'price_changed',
          oldPrice: item.currentPrice,
          newPrice: livePrice
        });
      }
    }

    if (issues.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cart validation failed',
        issues 
      });
    }

    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

// Helper function (implement according to your pricing logic)
function calculateLivePrice(product) {
  // Same logic as frontend calculateLiveDiscountedPrice
  let price = product.price;
  
  if (product.discount && 
      (!product.discount.expiresAt || new Date(product.discount.expiresAt) > new Date())) {
    if (product.discount.discountType === 'percentage') {
      price = product.price * (1 - product.discount.value / 100);
    } else {
      price = product.price - product.discount.value;
    }
  }
  
  return parseFloat(price.toFixed(2));
}

// Create order
// Create order
app.post('/api/orders', authenticate, async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod, promoCode } = req.body;
    
    // Validate required fields
    if (!deliveryAddress || !paymentMethod) {
      return res.status(400).json({ message: 'Delivery address and payment method are required' });
    }

    // Get user with cart and populated products
    const user = await User.findById(req.user._id).populate({
      path: 'cart',
      populate: {
        path: 'items.product',
        model: 'Product'
      }
    });

    if (!user || !user.cart) {
      return res.status(400).json({ message: 'User cart not found' });
    }

    // Validate cart has items
    if (!user.cart.items?.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // First validate stock availability
    for (const item of user.cart.items) {
      if (item.quantity > item.product.stock) {
        return res.status(400).json({ 
          message: `Not enough stock for ${item.product.name}. Available: ${item.product.stock}, Requested: ${item.quantity}` 
        });
      }
    }

    // Calculate order values
    let subtotal = user.cart.subtotal;
    let discounts = user.cart.discounts;
    let deliveryFee = subtotal >= 500 ? 0 : 50;
    let promoDiscount = 0;
    let appliedPromotions = [];

    // Calculate sum of promo-eligible items
    const promoEligibleTotal = user.cart.items.reduce((sum, item) => {
      return item.product.isPromotionEligible 
        ? sum + (item.currentPrice * item.quantity)
        : sum;
    }, 0);

    // Apply promotion if valid
    if (promoCode) {
      const promotion = await Promotion.findOne({ code: promoCode });
      
      if (promotion && promotion.isActive && 
          (!promotion.validTo || new Date(promotion.validTo) >= new Date()) &&
          promoEligibleTotal >= (promotion.minOrderValue || 0)) {
        
        let discountAmount = 0;
        if (promotion.discountType === 'percentage') {
          discountAmount = promoEligibleTotal * (promotion.discountValue / 100);
          if (promotion.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, promotion.maxDiscountAmount);
          }
        } else {
          discountAmount = promotion.discountValue;
        }

        promoDiscount = discountAmount;
        appliedPromotions.push({
          promotion: promotion._id,
          code: promotion.code,
          name: promotion.name,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          discountAmount
        });
      }
    }

    const total = subtotal - discounts - promoDiscount + deliveryFee;

    // Create order
    const order = new Order({
      orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user: user._id,
      items: user.cart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        priceAtPurchase: item.currentPrice,
        discountApplied: item.discountApplied
      })),
      subtotal,
      discounts,
      appliedPromotions,
      deliveryFee,
      total,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'completed'
      },
      deliveryAddress,
      status: 'placed'
    });

    // Save the order
    await order.save();

    // Update product stock quantities
    for (const item of user.cart.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Clear cart
    user.cart.items = [];
    user.cart.subtotal = 0;
    user.cart.discounts = 0;
    user.cart.total = 0;
    await user.cart.save();

    // Update promotion usage if applied
    if (appliedPromotions.length > 0) {
      const promotion = await Promotion.findById(appliedPromotions[0].promotion);
      promotion.usedCount += 1;
      
      const userUsed = promotion.usersUsed.find(u => u.user.equals(req.user._id));
      if (userUsed) {
        userUsed.count += 1;
        userUsed.lastUsed = new Date();
      } else {
        promotion.usersUsed.push({
          user: req.user._id,
          count: 1,
          lastUsed: new Date()
        });
      }
      
      await promotion.save();
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    handleError(res, error);
  }
});

// Get user's orders
app.get('/api/fetch-orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ placedAt: -1 }); // Sort by newest first
    
    res.json(orders);
  } catch (error) {
    handleError(res, error);
  }
});

// Get single order
app.get('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Verify the order belongs to the requesting user
    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json(order);
  } catch (error) {
    handleError(res, error);
  }
});

// Address Routes
app.post('/api/addresses', authenticate, async (req, res) => {
  try {
    const { label, street, city, state, postalCode, country, isDefault } = req.body;
    
    if (!street || !city || !state || !postalCode) {
      return res.status(400).json({ message: 'Required address fields are missing' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newAddress = {
      label: label || 'home',
      street,
      city,
      state,
      postalCode,
      country: country || 'India',
      isDefault: isDefault || false
    };

    // If setting as default, update all other addresses
    if (isDefault) {
      user.addresses = user.addresses.map(addr => ({
        ...addr,
        isDefault: false
      }));
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/addresses/:id', authenticate, async (req, res) => {
  try {
    const { label, street, city, state, postalCode, country, isDefault } = req.body;
    const addressId = req.params.id;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) return res.status(404).json({ message: 'Address not found' });

    // If setting as default, update all other addresses
    if (isDefault) {
      user.addresses = user.addresses.map(addr => ({
        ...addr,
        isDefault: false
      }));
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      label: label || user.addresses[addressIndex].label,
      street: street || user.addresses[addressIndex].street,
      city: city || user.addresses[addressIndex].city,
      state: state || user.addresses[addressIndex].state,
      postalCode: postalCode || user.addresses[addressIndex].postalCode,
      country: country || user.addresses[addressIndex].country,
      isDefault: isDefault !== undefined ? isDefault : user.addresses[addressIndex].isDefault
    };

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/addresses/:id', authenticate, async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    
    // If we deleted the default address, set a new default if any addresses remain
    if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/addresses/:id/default', authenticate, async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if address exists
    const addressExists = user.addresses.some(addr => addr._id.toString() === addressId);
    if (!addressExists) return res.status(404).json({ message: 'Address not found' });

    // Set all addresses to non-default, then set the specified one as default
    user.addresses = user.addresses.map(addr => ({
      ...addr,
      isDefault: addr._id.toString() === addressId
    }));

    await user.save();

    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Accept updated stock for a cart item
app.put('/api/customer/cart/item/:itemId/accept-stock', authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const product = item.product;
    if (!product) return res.status(400).json({ message: 'Invalid product in cart' });

    if (product.stock === 0) {
      item.remove(); // Remove item if out of stock
    } else if (item.quantity > product.stock) {
      item.quantity = product.stock; // Adjust to max available stock
    }

    await recalculateCart(cart);
    res.json(cart);
  } catch (error) {
    handleError(res, error);
  }
});


app.put('/api/customer/cart/item/:itemId/accept-all', authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const product = item.product;
    if (!product) return res.status(400).json({ message: 'Invalid product in cart' });

    // ------------------- PRICE -------------------
    const basePrice = typeof product.price === 'number' ? product.price : 0;
    const discountType = product.discount?.discountType || 'percentage';
    const discountValue = typeof product.discount?.value === 'number' ? product.discount.value : 0;

    const discountedPrice = discountType === 'percentage'
      ? parseFloat((basePrice * (1 - discountValue / 100)).toFixed(2))
      : parseFloat((basePrice - discountValue).toFixed(2));

    if (isNaN(discountedPrice)) {
      return res.status(400).json({ message: 'Invalid price data' });
    }

    item.currentPrice = discountedPrice;
    item.priceAtAddition = discountedPrice;
    item.discountApplied = {
      discountType,
      value: discountValue
    };
    item.priceChanged = false;

    // ------------------- STOCK -------------------
    if (typeof product.stock !== 'number') {
      return res.status(400).json({ message: 'Invalid stock data' });
    }

    if (product.stock === 0) {
      item.remove();
    } else if (item.quantity > product.stock) {
      item.quantity = product.stock;
    }

    item.stockChanged = false;

    await recalculateCart(cart);
    await cart.save();

    res.json(cart);
  } catch (error) {
    handleError(res, error);
  }
});

// Get all orders (admin only)
app.get('/api/admin/orders', authenticate, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .sort({ placedAt: -1 });
    res.json(orders);
  } catch (error) {
    handleError(res, error);
  }
});

// Update order status (admin only)
app.patch('/api/admin/orders/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    handleError(res, error);
  }
});

// Count endpoints for dashboard stats
app.get('/api/users/count', authenticate, adminOnly, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/products/count', authenticate, adminOnly, async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({ count });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/categories/count', authenticate, adminOnly, async (req, res) => {
  try {
    const count = await Category.countDocuments();
    res.json({ count });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/admin/orders/count', authenticate, adminOnly, async (req, res) => {
  try {
    const count = await Order.countDocuments();
    res.json({ count });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/promotions/count', authenticate, adminOnly, async (req, res) => {
  try {
    const count = await Promotion.countDocuments();
    res.json({ count });
  } catch (error) {
    handleError(res, error);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
