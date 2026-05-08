// ========================================
// 📁 ecommerce/frontend/src/utils/constants.js
// ========================================

export const COLORS = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#EC4899',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  sidebar: '#0F172A',
  background: '#F5F7FB',
  cardBg: 'rgba(255,255,255,0.75)',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    light: '#E2E8F0',
  }
};

export const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/admin', badge: null },
  { id: 'orders', label: 'Orders', icon: 'ShoppingCart', path: '/admin/orders', badge: '12' },
  { id: 'vendors', label: 'Vendors', icon: 'Store', path: '/admin/vendors', badge: '3' },
  { id: 'users', label: 'Users', icon: 'Users', path: '/admin/users', badge: null },
  { id: 'products', label: 'Products', icon: 'Package', path: '/admin/products', badge: null },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/admin/analytics', badge: null },
  { id: 'payments', label: 'Payments', icon: 'CreditCard', path: '/admin/payments', badge: null },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/admin/settings', badge: null },
];

export const MOCK_STATS = [
  {
    id: 'revenue',
    label: 'Total Revenue',
    value: '₹2,45,890',
    trend: '+12.5%',
    isPositive: true,
    icon: 'TrendingUp',
    color: 'primary',
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '1,234',
    trend: '+8.2%',
    isPositive: true,
    icon: 'ShoppingCart',
    color: 'secondary',
  },
  {
    id: 'customers',
    label: 'Customers',
    value: '5,678',
    trend: '+3.1%',
    isPositive: true,
    icon: 'Users',
    color: 'accent',
  },
  {
    id: 'vendors',
    label: 'Active Vendors',
    value: '89',
    trend: '-2.4%',
    isPositive: false,
    icon: 'Store',
    color: 'warning',
  },
];

export const MOCK_RECENT_ORDERS = [
  { id: '#ORD-2089', customer: 'Rahul Kumar', vendor: 'Electronics Store', amount: '₹4,299', status: 'delivered', date: '2 hours ago' },
  { id: '#ORD-2088', customer: 'Priya Singh', vendor: 'Fashion Hub', amount: '₹2,199', status: 'processing', date: '4 hours ago' },
  { id: '#ORD-2087', customer: 'Amit Patel', vendor: 'Home Decor', amount: '₹1,899', status: 'shipped', date: '1 day ago' },
  { id: '#ORD-2086', customer: 'Neha Gupta', vendor: 'Electronics Store', amount: '₹8,999', status: 'pending', date: '2 days ago' },
];

export const MOCK_TOP_VENDORS = [
  { rank: 1, name: 'Electronics Store', revenue: '₹12,45,890', orders: 456, growth: '+23%', avatar: '🏪' },
  { rank: 2, name: 'Fashion Hub', revenue: '₹9,87,654', orders: 234, growth: '+18%', avatar: '👗' },
  { rank: 3, name: 'Home Decor', revenue: '₹7,65,432', orders: 189, growth: '+12%', avatar: '🏠' },
];

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
};
