# Ryme Inventory Management System

A comprehensive inventory management system built with React and Firebase.

## Features

- **Dashboard** - Business overview with key metrics
- **Inventory Management** - Add, edit, delete products with cost/markup tracking
- **Order Management** - Create orders, apply discounts, generate PDF invoices
- **Tasks** - Task management with priorities and due dates
- **Calendar** - Event scheduling and management
- **Analytics** - Revenue, profit, and sales analytics with charts
- **Team Management** - Manage team members and roles
- **Activity Log** - Track all system activities
- **Recycle Bin** - Recover deleted items

## Tech Stack

- **Frontend**: React 18, React Router, Recharts
- **Backend**: Firebase Firestore
- **Styling**: Custom CSS with CSS Variables
- **PDF Generation**: jsPDF
- **Icons**: React Icons (Feather Icons)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ryme-inventory.git
cd ryme-inventory
```

2. Install dependencies:
```bash
cd server/client
npm install
```

3. Create a `.env` file in `server/client` with your Firebase config:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Run the development server:
```bash
npm run dev
```

## Deployment

### Netlify

1. Push to GitHub
2. Connect to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy!

Build settings are configured in `netlify.toml`.

## License

MIT License
