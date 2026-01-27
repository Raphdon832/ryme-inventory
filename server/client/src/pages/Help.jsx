import React, { useState, useEffect } from 'react';
import {
  HelpIcon,
  BookIcon,
  MessageCircleIcon,
  MailIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  BoxIcon,
  CartIcon,
  UsersIcon,
  AnalyticsIcon,
  CalendarIcon,
  CheckSquareIcon
} from '../components/CustomIcons';
import { usePageState } from '../hooks/usePageState';
import './Help.css';

const Help = () => {
  // Persist active category and expanded FAQ
  const { state: pageState, updateState: updatePageState } = usePageState('help', {
    activeCategory: 'general',
    expandedFaq: null,
  }, { persistScroll: true, scrollContainerSelector: '.main-content' });

  const [expandedFaq, setExpandedFaq] = useState(pageState.expandedFaq);
  const [activeCategory, setActiveCategory] = useState(pageState.activeCategory);

  // Persist state changes
  useEffect(() => {
    updatePageState({ activeCategory, expandedFaq });
  }, [activeCategory, expandedFaq]);

  const faqs = {
    general: [
      {
        question: 'How do I get started with Ryme Inventory?',
        answer: 'Start by adding your products in the Inventory section. Once you have products, you can create orders, track stock levels, and view analytics. Use the sidebar navigation to access different features.'
      },
      {
        question: 'How is profit calculated?',
        answer: 'Profit is calculated as: Sales Price - Cost of Production. For orders, total profit is the sum of individual item profits multiplied by their quantities, minus any discounts applied.'
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes! You can export order details as PDF invoices from the Order Details page. More export options for inventory and analytics are coming soon.'
      },
      {
        question: 'Is my data backed up?',
        answer: 'All data is stored securely in Firebase Cloud Firestore, which provides automatic backups and data redundancy across multiple locations.'
      }
    ],
    inventory: [
      {
        question: 'How do I add a new product?',
        answer: 'Go to Inventory → Click "Add Product" → Fill in product details including name, cost of production, markup, and stock quantity → Click "Add Product" to save.'
      },
      {
        question: 'What is markup percentage vs fixed markup?',
        answer: 'Markup Percentage adds a percentage of the cost to get the sales price (e.g., 50% markup on ₦100 = ₦150 sales price). Fixed Markup adds a specific amount (e.g., ₦50 markup on ₦100 = ₦150 sales price).'
      },
      {
        question: 'How do I track low stock items?',
        answer: 'Products with stock below 10 units are automatically flagged as "Low Stock" with a red indicator on the dashboard and inventory page.'
      },
      {
        question: 'Can I edit or delete products?',
        answer: 'Yes! In the Inventory page, click the edit icon to modify product details, or use the delete button to remove products. Deleted items go to the recycle bin first.'
      }
    ],
    orders: [
      {
        question: 'How do I create a new order?',
        answer: 'Go to Orders → Click "New Order" → Enter customer details → Add products and quantities → Apply any discounts → Click "Create Order" to save.'
      },
      {
        question: 'How do discounts work?',
        answer: 'You can apply either a percentage discount (e.g., 10% off total) or a fixed amount discount (e.g., ₦500 off). The discount is subtracted from the order subtotal.'
      },
      {
        question: 'What happens to stock when I create an order?',
        answer: 'Stock quantities are automatically reduced when an order is created. If a product has insufficient stock, you\'ll see a warning before placing the order.'
      },
      {
        question: 'Can I view and print invoices?',
        answer: 'Yes! Open any order from the Orders page, then click "Generate Invoice" to create and download a PDF invoice.'
      }
    ],
    team: [
      {
        question: 'How do I add team members?',
        answer: 'Go to Team → Click "Add Member" → Enter their name, email, phone, and role → Click "Add Member" to save.'
      },
      {
        question: 'What are the different roles?',
        answer: 'Roles include Admin (full access), Manager (most features), Staff (basic access), Sales (order management), and Inventory (product management). Roles help organize your team.'
      },
      {
        question: 'Can I deactivate a team member?',
        answer: 'Yes! Click "Deactivate" on any team member card to mark them as inactive. They can be reactivated later if needed.'
      }
    ]
  };

  const categories = [
    { id: 'general', name: 'General', icon: FiHelpCircle },
    { id: 'inventory', name: 'Inventory', icon: FiBox },
    { id: 'orders', name: 'Orders', icon: FiShoppingCart },
    { id: 'team', name: 'Team', icon: FiUsers }
  ];

  const quickLinks = [
    { name: 'Dashboard', icon: FiBarChart2, description: 'View your business overview' },
    { name: 'Inventory', icon: FiBox, description: 'Manage products and stock' },
    { name: 'Orders', icon: FiShoppingCart, description: 'Create and track orders' },
    { name: 'Tasks', icon: FiCheckSquare, description: 'Manage your to-do list' },
    { name: 'Calendar', icon: FiCalendar, description: 'Schedule events and reminders' },
    { name: 'Analytics', icon: FiBarChart2, description: 'Track performance metrics' }
  ];

  return (
    <div className="help-page">
      <div className="page-header">
        <div>
          <h1>Help Center</h1>
          <p>Find answers and get support</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="help-section">
        <h2><BookIcon /> Quick Start Guide</h2>
        <div className="quick-links-grid">
          {quickLinks.map((link, index) => (
            <div key={index} className="quick-link-card">
              <div className="quick-link-icon">
                <link.icon size={20} />
              </div>
              <div className="quick-link-content">
                <h4>{link.name}</h4>
                <p>{link.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="help-section">
        <h2><HelpIcon /> Frequently Asked Questions</h2>
        
        <div className="faq-categories">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => { setActiveCategory(cat.id); setExpandedFaq(null); }}
            >
              <cat.icon size={16} />
              {cat.name}
            </button>
          ))}
        </div>

        <div className="faq-list">
          {faqs[activeCategory].map((faq, index) => (
            <div 
              key={index} 
              className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
            >
              <button 
                className="faq-question"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <span>{faq.question}</span>
                {expandedFaq === index ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </button>
              {expandedFaq === index && (
                <div className="faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="help-section contact-section">
        <h2><MessageCircleIcon /> Need More Help?</h2>
        <div className="contact-cards">
          <div className="contact-card">
            <div className="contact-icon">
              <MailIcon size={24} />
            </div>
            <h4>Email Support</h4>
            <p>Get help from our support team</p>
            <a href="mailto:support@rymeinteriors.com" className="contact-link">
              support@rymeinteriors.com
              <ExternalLinkIcon size={14} />
            </a>
          </div>
          <div className="contact-card">
            <div className="contact-icon">
              <MessageCircleIcon size={24} />
            </div>
            <h4>WhatsApp</h4>
            <p>Chat with us directly</p>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" className="contact-link">
              Send Message
              <ExternalLinkIcon size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="version-info">
        <p>Ryme Inventory Management v1.0.0</p>
        <p>© 2026 Ryme Interiors. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Help;
