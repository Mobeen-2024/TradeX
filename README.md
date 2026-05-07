# TradeX Pro Terminal

**TradeX Pro** is a high-performance, institutional-grade cryptocurrency trading terminal and execution engine. It combines a sleek glassmorphic UI with a powerful, micro-worker-driven backend to simulate professional exchange workflows, automated execution strategies, and real-time AI market intelligence.

## 🚀 Key Institutional Features

- **Real-Time AI Market Intelligence:** Integrated with **Google Gemini (AI Studio)** for live sentiment analysis, trade intent detection, and automated market level identification.
- **Smart Order Routing (SOR):** Institutional execution engine supporting **TWAP (Time-Weighted Average Price)** strategies to minimize slippage and market impact.
- **Micro-Worker Architecture:** Multi-threaded background workers (via Node.js Worker Threads) for non-blocking strategy execution and heavy data processing.
- **Risk Management Engine:** Automated pre-trade risk checks including leverage limits, position sizing, and notional USD exposure validation.
- **Encrypted Credential Vault:** AES-256-GCM encrypted storage for exchange API keys, utilizing a master key derived from environment secrets.
- **Advanced State Management:** High-speed data synchronization using **Redis** for global state, order books, and active positions.
- **Professional Charting:** Deep integration with `lightweight-charts` for high-frequency OHLCV and technical indicator rendering.
- **Observability:** Built-in **Prometheus** metrics and **Grafana** dashboards for monitoring execution latency and worker health.

## 🛠 Advanced Tech Stack

**Frontend:**
- **Vue 3** (Composition API) + **Vite**
- **Tailwind CSS v4** (Glassmorphic Design System)
- **Lightweight Charts** for financial visualization
- **Lucide Icons** & **VueUse** utilities

**Backend:**
- **Fastify** (High-performance web framework)
- **Worker Threads** for concurrent algorithm execution
- **Redis** & **BullMQ** for state persistence and task queuing
- **Google Gemini API** for LLM-driven market analysis
- **Node-Forge** for cryptographic operations

**Infrastructure & DevOps:**
- **Docker & Docker Compose** for containerized local development
- **Kubernetes (K8s)** with HPA and Ingress support for scalable production
- **Terraform** for Infrastructure as Code (AWS EKS, VPC)
- **Prometheus & Grafana** for full-stack observability

## 📦 Getting Started

### Prerequisites
- Node.js (v20+)
- Redis instance (local or managed)
- Google Gemini API Key

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your GEMINI_API_KEY and REDIS_URL
   ```

3. Start the full-stack development environment:
   ```bash
   npm run dev
   ```

## 🏗 Infrastructure & Deployment

### Docker
Run the full stack (App + Redis) using Docker Compose:
```bash
docker-compose up --build
```

### Kubernetes
Deploy to a cluster using the provided manifests:
```bash
kubectl apply -f k8s/
```

### Infrastructure (Terraform)
Provision AWS infrastructure (VPC, EKS):
```bash
cd terraform
terraform init
terraform apply
```

## 📜 Available Scripts

- `npm run dev` - Start the development server (Fastify + Vite middleware).
- `npm run build` - Compile the frontend for production.
- `npm run start` - Run the application in production mode.
- `npm run lint` - Perform static type checking.
- `npm run clean` - Remove build artifacts.

## 🛡 Security & Reliability
- **Circuit Breakers:** Application-level guards to prevent cascading failures during API outages.
- **Zod Validation:** Strict schema enforcement for all API and WebSocket payloads.
- **Graceful Shutdown:** Ensures all workers are stopped and TWAP orders are safely paused before process exit.

