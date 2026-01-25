import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { UIProvider } from './contexts/UIContext';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AddProduct from './pages/AddProduct';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import CreateOrder from './pages/CreateOrder';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Expenses from './pages/Expenses';
import Taxes from './pages/Taxes';
import Team from './pages/Team';
import Help from './pages/Help';
import Income from './pages/Income';
import Vouchers from './pages/Vouchers';
import ReloadPrompt from './components/ReloadPrompt';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <UIProvider>
        <ReloadPrompt />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/add" element={<AddProduct />} />
              <Route path="/inventory/edit/:id" element={<AddProduct />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/new" element={<CreateOrder />} />
              <Route path="/orders/edit/:id" element={<CreateOrder />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/activity-log" element={<ActivityLog />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/income" element={<Income />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/taxes" element={<Taxes />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/team" element={<Team />} />
              <Route path="/help" element={<Help />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </UIProvider>
    </ToastProvider>
  );
}

export default App;
