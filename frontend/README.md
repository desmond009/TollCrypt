# TollChain Frontend

This is the frontend application for TollChain, a blockchain-based toll collection system built with React and wagmi.

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the frontend directory based on `env.example`:

```bash
cp env.example .env
```

### 2. WalletConnect Project ID Setup

To enable WalletConnect functionality, you need to get a project ID from WalletConnect Cloud:

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up or log in to your account
3. Create a new project
4. Copy your project ID
5. Update your `.env` file:

```env
REACT_APP_WALLETCONNECT_PROJECT_ID=your_actual_project_id_here
```

**Note:** Without a proper WalletConnect project ID, the WalletConnect connector will be disabled, but the app will still work with browser wallets (MetaMask, etc.) and Coinbase Wallet.

### 3. Other Environment Variables

Update the following variables in your `.env` file:

```env
# Contract Addresses (update with deployed contract addresses)
REACT_APP_TOLL_COLLECTION_ADDRESS=0x...
REACT_APP_USDC_ADDRESS=0x...

# RPC URLs (use your preferred RPC providers)
REACT_APP_POLYGON_RPC_URL=https://polygon-rpc.com
REACT_APP_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Backend API URL
REACT_APP_API_URL=http://localhost:3001
```

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
