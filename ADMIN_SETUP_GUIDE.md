# 🚀 Premium Admin Dashboard - Installation & Setup Guide

## Step 1: Install Dependencies

```bash
cd ecommerce/frontend

npm install framer-motion recharts lucide-react socket.io-client
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms tailwindcss-glass

npx tailwindcss init -p
```

## Step 2: Configure Tailwind

Replace `tailwind.config.js` with the provided configuration file.

## Step 3: Copy Component Files

Create the following folder structure:

```
src/
├── components/
│   ├── admin/
│   │   ├── Layout/
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopNav.jsx
│   │   │   └── CommandPalette.jsx (create next)
│   │   │
│   │   ├── Cards/
│   │   │   ├── StatsCard.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   └── RecentActivityCard.jsx
│   │   │
│   │   └── Tables/
│   │       └── DataTable.jsx
│   │
│   └── common/
│       ├── Button.jsx
│       └── Badge.jsx
│
├── pages/
│   └── admin/
│       ├── Dashboard.jsx
│       ├── Orders.jsx (create next)
│       ├── Vendors.jsx (create next)
│       └── Users.jsx (create next)
│
├── utils/
│   └── constants.js
│
├── styles/
│   └── admin-theme.css
│
└── hooks/
    ├── useAdmin.js (create next)
    ├── useTheme.js (create next)
    └── useNotifications.js (create next)
```

## Step 4: Add CSS Import

In `src/index.css` or `src/App.jsx`, add:

```jsx
import './styles/admin-theme.css';
```

## Step 5: Setup Routing

In `src/App.jsx`:

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/admin/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Dashboard />} />
        {/* Add other admin routes */}
      </Routes>
    </Router>
  );
}

export default App;
```

## Step 6: Create Additional Pages

### Orders Page (src/pages/admin/Orders.jsx)

```jsx
import React from 'react';
import AdminLayout from '../../components/admin/Layout/AdminLayout';
import DataTable from '../../components/admin/Tables/DataTable';

export default function Orders() {
  const orderColumns = [
    { key: 'id', label: 'Order ID', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'date', label: 'Date', sortable: true },
  ];

  // Fetch orders from API
  const orders = [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <DataTable
          title="All Orders"
          columns={orderColumns}
          data={orders}
          searchPlaceholder="Search orders..."
          actions={[
            { label: 'View', className: 'bg-blue-50 text-blue-600', onClick: (row) => {} },
            { label: 'Edit', className: 'bg-purple-50 text-purple-600', onClick: (row) => {} },
          ]}
        />
      </div>
    </AdminLayout>
  );
}
```

## Step 7: Create Custom Hooks

### hooks/useTheme.js

```jsx
import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, setIsDark };
};
```

### hooks/useNotifications.js

```jsx
import { useState, useCallback } from 'react';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notif) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { ...notif, id }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  return { notifications, addNotification };
};
```

## Step 8: Setup Real-Time Updates (Socket.io)

```jsx
// hooks/useSocket.js
import { useEffect, useCallback } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const socket = io(process.env.REACT_APP_API_URL);

  const subscribe = useCallback((event, callback) => {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [socket]);

  return { socket, subscribe };
};
```

## Step 9: Environment Variables

Create `.env.local`:

```
REACT_APP_API_URL=http://localhost:4000
REACT_APP_SOCKET_URL=http://localhost:4000
REACT_APP_MODE=development
```

## Step 10: Run Development Server

```bash
npm start
```

Visit: `http://localhost:3000/admin`

---

## 📋 Component API Reference

### AdminLayout
Wrapper component for admin pages with sidebar and topnav.

```jsx
<AdminLayout>
  {/* Your content */}
</AdminLayout>
```

### StatsCard
Display metrics with trend and sparkline.

```jsx
<StatsCard
  label="Total Revenue"
  value="₹2,45,890"
  trend="+12.5%"
  isPositive={true}
  icon="TrendingUp"
  color="primary"
  sparklineData={[...]}
/>
```

### DataTable
Reusable table with search, sort, filter, pagination.

```jsx
<DataTable
  title="Orders"
  columns={[
    { key: 'id', label: 'ID', sortable: true },
    { key: 'status', label: 'Status', type: 'status' }
  ]}
  data={data}
  actions={[
    { label: 'View', onClick: handleView }
  ]}
/>
```

---

## 🎨 Customization

### Change Color Scheme

Edit `utils/constants.js`:

```javascript
export const COLORS = {
  primary: '#FF6B6B',    // Change primary color
  secondary: '#4ECDC4',  // Change secondary
  // ... etc
};
```

### Add New Sidebar Item

```javascript
export const SIDEBAR_ITEMS = [
  // ... existing items
  { 
    id: 'custom', 
    label: 'Custom Page', 
    icon: 'CustomIcon', 
    path: '/admin/custom',
    badge: '5'
  },
];
```

### Modify Theme Colors

Edit `styles/admin-theme.css` and `tailwind.config.js`.

---

## 🔧 Advanced Features

### Add Command Palette (Cmd+K)

```jsx
// pages/admin/Dashboard.jsx - Add to component
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Add Dark/Light Mode Toggle

```jsx
// Use useTheme hook
const { isDark, setIsDark } = useTheme();

// Toggle in TopNav button
<button onClick={() => setIsDark(!isDark)}>
  {isDark ? <Sun /> : <Moon />}
</button>
```

### Setup Real-Time Notifications

```jsx
// In Dashboard
const { subscribe } = useSocket();

useEffect(() => {
  const unsubscribe = subscribe('order:new', (order) => {
    addNotification({
      title: 'New Order',
      message: `Order ${order.id} received`
    });
  });

  return unsubscribe;
}, []);
```

---

## 📊 API Integration

### Fetch Data Example

```jsx
useEffect(() => {
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  fetchOrders();
}, []);
```

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
netlify deploy --prod --dir=build
```

---

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: Full layout with sidebar
- **Tablet**: Collapsed sidebar, drawer for mobile
- **Mobile**: Hidden sidebar, hamburger menu

No additional configuration needed - Tailwind handles breakpoints automatically.

---

## 🎯 Next Steps

1. ✅ Setup admin authentication
2. ✅ Connect to real APIs
3. ✅ Add more admin pages (Vendors, Users, Products, Analytics)
4. ✅ Implement data export (CSV, PDF)
5. ✅ Add admin activity logs
6. ✅ Setup email notifications
7. ✅ Add role-based permissions

---

## 📞 Support

For issues or questions:
- Check component documentation in comments
- Review Framer Motion docs: https://www.framer.com/motion/
- Check Tailwind CSS: https://tailwindcss.com/
- Recharts: https://recharts.org/

---

**Happy coding! 🚀**
