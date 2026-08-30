# 🧠 Monday.com Business Intelligence Agent

An AI-powered Business Intelligence Agent that answers founder-level queries by connecting to Monday.com boards containing work orders and deals data.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 16 App Router                       │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │   React UI   │    │           API Routes                 │   │
│  │  (Client)    │◄───┤  /api/chat  /api/boards  /api/health│   │
│  │              │    │  /api/sessions                       │   │
│  └──────────────┘    └──────────────┬──────────────────────┘   │
│                                     │                           │
│                          ┌──────────▼──────────┐               │
│                          │    AI Agent Core     │               │
│                          │  (GPT-4o + Tools)    │               │
│                          └──────────┬──────────┘               │
└─────────────────────────────────────┼──────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
    ┌─────────▼──────────┐  ┌────────▼────────┐  ┌──────────▼───────┐
    │  Monday.com API v2 │  │  Data Normalizer│  │  PostgreSQL DB   │
    │  (GraphQL, read-   │  │  (Handles messy │  │  (Conversation + │
    │  only, paginated)  │  │  real-world data│  │  Board Cache)    │
    └────────────────────┘  └─────────────────┘  └──────────────────┘
```

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 16 (App Router) | Full-stack, server components, API routes |
| AI | OpenAI GPT-4o | Best reasoning for messy data interpretation |
| Agent Pattern | Tool Calling (Function Calling) | Structured data retrieval + analysis |
| Database | PostgreSQL + Drizzle ORM | Conversation history + board caching |
| Styling | Tailwind CSS 4 | Utility-first, dark mode UI |
| Monday.com | REST/GraphQL API v2 | Read-only board & item access |

## Features

### Core Capabilities
- **Conversational BI** — Ask natural language questions, get executive-ready answers
- **Live Monday.com Data** — Queries boards in real-time (5-min cache for performance)
- **Data Resilience** — Normalizes 10+ date formats, currency variations, null values
- **Cross-Board Analysis** — Correlates Deals pipeline with Work Orders execution
- **Leadership Reports** — Structured board-ready updates on demand
- **Session Memory** — Conversation history persisted in PostgreSQL

### AI Agent Tools
1. `fetch_boards` — Discover available Monday.com boards
2. `fetch_deals_data` — Pipeline analysis with metrics
3. `fetch_work_orders_data` — Revenue and operational analysis
4. `cross_board_analysis` — Multi-board correlation
5. `generate_leadership_update` — Structured executive reports

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- Monday.com account with API access
- OpenAI API account

### 2. Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db

# Monday.com API Token
# Get from: monday.com → Profile → API → Generate Personal Token
MONDAY_API_KEY=your_monday_api_token_here

# OpenAI API Key
# Get from: platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...

# Optional: Explicit Board IDs (auto-detected if not set)
# MONDAY_DEALS_BOARD_ID=1234567890
# MONDAY_WO_BOARD_ID=9876543210
```

### 3. Monday.com Configuration

1. **Import CSV files** — Go to Monday.com → "+" to create a board → Import from Excel/CSV
   - Import `Deal funnel Data.xlsx` as **"Deals Pipeline"** board
   - Import `Work_Order_Tracker Data.xlsx` as **"Work Order Tracker"** board

2. **Set column types** (recommended):
   - Dates → Date column type
   - Values/Amounts → Number column type  
   - Statuses → Status column type
   - Sectors/Owners → Text or Dropdown

3. **Get your API token**:
   - Click your avatar → Profile → API
   - Generate a Personal API Token
   - Copy to `MONDAY_API_KEY` in `.env`

4. **Find Board IDs** (if auto-detection fails):
   - Open your board → Copy the number from the URL
   - Example: `monday.com/boards/1234567890` → ID is `1234567890`

### 4. Database Setup

```bash
# Install dependencies
npm install

# Push schema to database
npx drizzle-kit push

# Start development server
npm run dev
```

### 5. Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Main AI chat endpoint
│   │   ├── boards/route.ts     # Monday.com board listing
│   │   ├── sessions/route.ts   # Conversation session management
│   │   └── health/route.ts     # Health check
│   ├── globals.css             # Global styles (dark theme)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page (server component)
├── components/
│   ├── ChatInterface.tsx       # Main chat UI orchestrator
│   ├── ChatMessage.tsx         # Message rendering with markdown
│   ├── ChatInput.tsx           # Input with keyboard shortcuts
│   ├── Sidebar.tsx             # Session list + navigation
│   ├── BoardStatus.tsx         # Monday.com connection status
│   ├── SuggestedQueries.tsx    # Query suggestions on empty state
│   ├── SetupGuide.tsx          # API key configuration guide
│   ├── ConfigModal.tsx         # Configuration modal
│   ├── MetricCards.tsx         # Inline metric visualization
│   └── LeadershipReport.tsx    # Leadership report renderer
├── db/
│   ├── index.ts                # Drizzle DB client
│   └── schema.ts               # PostgreSQL table definitions
└── lib/
    ├── ai-agent.ts             # GPT-4o agent with tool calling
    ├── analytics.ts            # Business intelligence computations
    ├── data-normalizer.ts      # Data cleaning & normalization
    ├── monday-client.ts        # Monday.com GraphQL API client
    ├── tool-executor.ts        # AI tool call executor
    └── utils.ts                # Utility functions
```

## Example Queries

The agent handles natural language questions like:

- *"How's our overall pipeline looking?"*
- *"What's our energy sector performance this quarter?"*
- *"Show me billed vs collected breakdown by sector"*
- *"Who are our top performers by deal value?"*
- *"Generate a leadership update for the board meeting"*
- *"What's our collection rate and outstanding AR?"*
- *"Which work orders are at risk of non-collection?"*
- *"Compare pipeline value to actual revenue executed"*

## Data Handling

### Normalization
- **Dates**: Handles DD/MM/YYYY, MM/DD/YYYY, ISO, Q1 2024, "March 2024", etc.
- **Currency**: Strips ₹, $, commas, handles Lakh/Crore formatting
- **Status**: Maps variations ("closed won" → "Won", "in progress" → "In Progress")
- **Sectors**: Normalizes sector names across both boards
- **Nulls**: Graceful handling — never crashes, always reports data quality

### Data Quality
The agent communicates data completeness percentages and caveats when:
- Missing fields detected (> 20% missing)
- Inconsistent formats found
- Cross-board correlation has gaps

## Decision Log

See the in-app Decision Log (sidebar → Decision Log button) for:
- Key assumptions made
- Trade-offs and why
- What would be built with more time
- Leadership updates interpretation

## API Reference

### POST /api/chat
```json
{
  "message": "How's our pipeline?",
  "sessionId": "session_1234567890_abc123"
}
```

Response:
```json
{
  "message": "Your pipeline analysis...",
  "toolsUsed": ["fetch_boards", "fetch_deals_data"],
  "metadata": { "type": "deals", "hasData": true },
  "sessionId": "session_1234567890_abc123"
}
```

### GET /api/boards
Returns list of Monday.com boards with connection status.

### GET /api/health
Returns API connectivity status for Monday.com and OpenAI.

## Monday.com API Integration

- **Version**: API v2 (GraphQL)
- **Auth**: Bearer token via `Authorization` header
- **Pagination**: Cursor-based, handles unlimited board sizes
- **Rate Limiting**: 5-minute cache reduces API calls
- **Scope**: Read-only (`boards:read`)
- **Endpoint**: `https://api.monday.com/v2`
