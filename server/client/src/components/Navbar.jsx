import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">Ryme Interiors</div>
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>Inventory</Link>
        <Link to="/orders" className={isActive('/orders')}>Orders</Link>
      </div>
    </nav>
  );
};

export default Navbar;
