const mongoose = require('mongoose');

// Define CartItem schema first
const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  priceAtAddition: {
    type: Number,
    required: true
  },
  currentPrice: Number,
  priceChanged: Boolean,
  discountApplied: {
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    value: Number
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Define OrderItem schema
const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtPurchase: {
    type: Number,
    required: true
  },
  discountApplied: {
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    value: Number,
    source: {
      type: String,
      enum: ['product', 'manual'],
      default: 'product'
    }
  }
}, { _id: false });

// Define all schemas
const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  description: String,
  isActive: { type: Boolean, default: true },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, { versionKey: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: props => `${props.value} is not a valid email!`
    }
  },
  passwordHash: { type: String, required: true },
  addresses: [{
    label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' },
    isDefault: Boolean
  }],
  phone: {
    type: String,
    validate: {
      validator: v => /^[0-9]{10}$/.test(v),
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'delivery'],
    default: 'customer'
  },
  cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
  createdAt: { type: Date, default: Date.now, immutable: true }
}, { versionKey: false });

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [String],
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  isPromotionEligible: {
    type: Boolean,
    default: true,
    index: true
  },
  priceHistory: [{
    price: Number,
    changedAt: { type: Date, default: Date.now }
  }],
  discount: {
    discountType: { type: String, enum: ['percentage', 'fixed'] },
    value: Number,
    expiresAt: Date
  },
  unit: String,
  brand: String,
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, { versionKey: false });

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [CartItemSchema],
  subtotal: { type: Number, default: 0 },
  discounts: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  lastPriceCheck: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  discounts: { type: Number, default: 0 },
  appliedPromotions: [{
    promotion: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
    code: String,
    name: String,
    discountType: String,
    discountValue: Number,
    discountAmount: Number
  }],
  deliveryFee: { type: Number, default: 0 },
  total: { type: Number, required: true },
  payment: {
    method: {
      type: String,
      enum: ['cod', 'card', 'upi', 'netbanking'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' }
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'placed'
  },
  deliveryPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expectedDelivery: Date,
  cancellationReason: String,
  placedAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

const PromotionSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  description: String,
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number },
  validFrom: { type: Date, default: Date.now },
  validTo: Date,
  usageType: {
    type: String,
    enum: ['general', 'single-use', 'multi-use'],
    default: 'general',
    required: true
  },
  maxTotalUses: { type: Number },
  maxUsesPerUser: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  usersUsed: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 },
    lastUsed: Date
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { versionKey: false });

// Create and export models
const Category = mongoose.model('Category', CategorySchema);
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Cart = mongoose.model('Cart', CartSchema);
const Order = mongoose.model('Order', OrderSchema);
const Promotion = mongoose.model('Promotion', PromotionSchema);

module.exports = {
  Category,
  User,
  Product,
  Cart,
  Order,
  Promotion,
  CartItemSchema,
  OrderItemSchema
};