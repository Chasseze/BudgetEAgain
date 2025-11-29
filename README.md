# Budget Tracker App 💰

A modern, mobile-friendly budget and expense tracking application built with React, TypeScript, and Tailwind CSS. Features dark mode, savings goals, analytics, receipt management, and Firebase hosting support.

![Budget Tracker](https://img.shields.io/badge/Budget-Tracker-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178c6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38bdf8?style=flat-square&logo=tailwindcss)

## ✨ Features

### Core Features
- 📊 **Transaction Tracking** - Add, edit, and delete income/expense transactions
- 💳 **Category Management** - Organize spending with customizable categories
- 📈 **Visual Analytics** - Interactive charts (pie, bar, area) powered by Recharts
- 🎯 **Savings Goals** - Set and track progress towards financial goals
- 🧾 **Receipt Management** - Upload and attach receipts to transactions
- 🔍 **Search & Filter** - Find transactions by description, category, date range

### User Experience
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Mobile-First Design** - Responsive layout with bottom navigation for mobile
- 💾 **Local Storage** - Data persists across browser sessions
- 📤 **CSV Export** - Export your transaction data
- ⚡ **Real-time Alerts** - Get notified when approaching budget limits
- ↩️ **Undo Delete** - Recover accidentally deleted transactions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase CLI (for deployment)

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd BudgetEAgain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
BudgetEAgain/
├── src/
│   ├── components/          # React components
│   │   ├── CategoryBadge.tsx
│   │   ├── Charts.tsx
│   │   ├── GoalsSection.tsx
│   │   ├── MobileNav.tsx
│   │   ├── OverviewCards.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── SettingsSection.tsx
│   │   ├── Toast.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionModal.tsx
│   │   └── index.ts
│   ├── config/              # Configuration files
│   │   ├── categories.tsx
│   │   └── constants.ts
│   ├── hooks/               # Custom React hooks
│   │   └── useLocalStorage.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── helpers.ts
│   ├── App.tsx              # Main application component
│   ├── index.tsx            # Application entry point
│   └── index.css            # Global styles & Tailwind
├── public/                  # Static assets
├── firebase.json            # Firebase hosting config
├── .firebaserc              # Firebase project config
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite bundler configuration
└── README.md                # This file
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |
| `npm run firebase:deploy` | Build and deploy to Firebase |
| `npm run firebase:serve` | Serve Firebase locally |

## 🔥 Firebase Deployment

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Once created, note your project ID

### Step 2: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 3: Login to Firebase

```bash
firebase login
```

### Step 4: Configure Your Project

Update `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

### Step 5: Initialize Firebase (if needed)

```bash
firebase init hosting
```

Select:
- Use an existing project → Select your project
- Public directory → `dist`
- Single-page app → Yes
- Set up automatic builds → No (unless you want CI/CD)

### Step 6: Deploy

```bash
npm run firebase:deploy
```

Or manually:

```bash
npm run build
firebase deploy
```

Your app will be available at: `https://your-project-id.web.app`

## 📱 Mobile Optimization

This app is designed mobile-first with:

- **Bottom Navigation** - Easy thumb access on mobile devices
- **Safe Area Support** - Proper spacing for notched devices (iPhone X+)
- **Touch Optimized** - Large tap targets and swipe-friendly interactions
- **PWA Ready** - Can be added to home screen (add manifest for full PWA)
- **Responsive Breakpoints** - Optimized for all screen sizes

## 🎨 Customization

### Changing Colors

Edit `tailwind.config.js` to customize the color palette:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#6366f1', // Change this
        600: '#4f46e5',
      },
    },
  },
}
```

### Adding New Categories

Edit `src/config/constants.ts`:

```typescript
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  // Add your new category here
  'My New Category',
];

export const CATEGORY_CONFIG = {
  'My New Category': { color: '#ff6b6b', budget: 200 },
  // ...
};
```

### Modifying Default Budget

Edit `src/config/constants.ts`:

```typescript
export const DEFAULT_BUDGET_LIMIT = 2500; // Change this value
```

## 🔧 Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite 5
- **Hosting**: Firebase Hosting

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

Made with ❤️ and React