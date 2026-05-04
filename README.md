# TradeX Terminal

**TradeX** is a high-performance, real-time cryptocurrency trading terminal simulating professional-grade exchange workflows. Built with a modern dual-stack architecture, it features a highly reactive frontend and a high-speed streaming backend, all wrapped in a sleek, glassmorphic UI.

## 🚀 Features

- **Real-Time Market Data:** Live price streaming and order book updates via Fastify WebSockets.
- **Advanced Order Management:** Support for Market, Limit, Stop Loss, Take Profit, and Trailing Stop orders with margin and leverage calculations.
- **Professional Charting:** Integrated `lightweight-charts` for smooth, interactive OHLCV candlestick rendering.
- **Mock Trading Engine:** Built-in simulation engine executing triggered orders and dynamically tracking PnL.
- **Modern UI/UX:** Premium glassmorphic design language built with Tailwind CSS, supporting complex multi-chart workspaces and mobile-responsive layouts.
- **Live Portfolio Tracking:** Real-time balance updates, asset allocation visualization, and active position management.

## 🛠 Tech Stack

**Frontend:**
- [Vue 3](https://vuejs.org/) (Composition API)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- [Lucide Icons](https://lucide.dev/)

**Backend:**
- [Fastify](https://fastify.dev/)
- `@fastify/websocket`
- Node.js (TypeScript / tsx)

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

1. Clone the repository (if applicable) and install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (runs both the Fastify backend and the Vite frontend):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local address provided in your terminal (typically `http://localhost:3000`).

## 🏗 Architecture Overview

- **Backend (`server.ts`):** Serves as an all-in-one execution engine and WebSocket gateway. It mounts the Vite dev server as middleware to provide a seamless single-port developer experience.
- **State Management (`src/store/`):** Utilizes custom, reactive Vue composables for tracking active trades, global prices, and user configurations.
- **Data Persistence:** Automatically tracks simulated positions locally inside `mock_db.json`.

## 📜 Scripts

- `npm run dev` - Start the full-stack development server.
- `npm run build` - Compile the frontend for production.
- `npm run start` - Run the application in production mode.
- `npm run lint` - Run TypeScript type checking.
