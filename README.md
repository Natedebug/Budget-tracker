# BudgetSync Field

A mobile-first construction project budget tracking application designed for field superintendents and project managers. Track costs in real-time through timesheets, progress reports, equipment logs, material entries, subcontractor entries, and overhead costs with AI-powered receipt scanning.

## Features

### Core Budget Tracking
- **Project Management**: Create projects with total budgets broken down by category (labor, materials, equipment, subcontractors, overhead)
- **Real-time Cost Tracking**: Automatic daily budget calculations based on all cost entries
- **Visual Budget Alerts**: Color-coded budget status (green/yellow/red) with burn rate projections
- **Multi-Project Support**: Switch between multiple active projects

### Cost Entry Types
- **Timesheets**: Track daily labor costs with employee hours and pay rates
- **Progress Reports**: Monitor project completion with inline material tracking
- **Equipment Logs**: Record equipment hours, fuel costs, and rental expenses
- **Materials**: Track material quantities and costs (standalone or linked to progress reports)
- **Subcontractors**: Log third-party contractor expenses
- **Overhead**: Track administrative and indirect costs

### Smart Features
- **AI-Powered Receipt Scanning**: Upload receipt photos (JPG/PNG) and automatically extract vendor, date, line items, totals, and tax using GPT-4o Vision
- **Auto-fill from Receipts**: Receipt data automatically populates form fields across all entry types
- **Employee Management**: Manage employees with default pay rates that auto-fill in timesheets
- **Gmail Integration**: Connect a company Gmail inbox to automatically import receipt emails forwarded by employees
- **CSV Export**: Export all project data to CSV for external analysis

### Technical Highlights
- **Atomic Transactions**: Progress reports with materials created atomically using database transactions
- **Receipt Linking**: Polymorphic receipt system supports attaching multiple receipts to any entry type
- **Offline-Ready Design**: Mobile-first UI optimized for field use with large touch targets and high contrast
- **Authentication**: Secure OIDC authentication via Replit Auth (Google, GitHub, email/password)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **Wouter** for lightweight routing
- **TanStack Query** (React Query v5) for server state management
- **Shadcn/ui** + **Radix UI** for accessible component primitives
- **Tailwind CSS** for styling with custom design system
- **React Hook Form** + **Zod** for type-safe form validation

### Backend
- **Node.js** + **Express.js**
- **TypeScript** end-to-end
- **Drizzle ORM** for type-safe database queries
- **PostgreSQL** (Neon serverless) for production database
- **OpenAI GPT-4o Vision API** for receipt image analysis
- **Replit Auth** (OIDC) for authentication

### Infrastructure
- **Replit** for hosting and deployment
- **Gmail API** (via Replit connector) for email integration
- **Multer** for file uploads (receipt images)

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL database (Neon recommended)
- OpenAI API key (for receipt scanning)
- Gmail API credentials (optional, for email integration)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd budgetsync-field
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-here

# OpenAI API Key (for receipt scanning)
OPENAI_API_KEY=sk-your-openai-api-key

# Replit Auth (OIDC) - automatically provided on Replit
# REPLIT_AUTH_CLIENT_ID=
# REPLIT_AUTH_CLIENT_SECRET=
# REPLIT_AUTH_ISSUER_URL=
```

### 4. Set Up the Database

Push the database schema:

```bash
npm run db:push
```

### 5. Run the Development Server

```bash
npm run dev
```

The application will start on http://localhost:5000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random string for session encryption |
| `OPENAI_API_KEY` | Yes | OpenAI API key for receipt scanning |
| `REPLIT_AUTH_CLIENT_ID` | Auto | Replit Auth client ID (auto-provided on Replit) |
| `REPLIT_AUTH_CLIENT_SECRET` | Auto | Replit Auth secret (auto-provided on Replit) |
| `REPLIT_AUTH_ISSUER_URL` | Auto | Replit Auth issuer URL (auto-provided on Replit) |

## Project Structure

```
budgetsync-field/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # Utilities and helpers
│   │   └── App.tsx        # Root component with routing
├── server/                 # Backend Express application
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data access layer
│   ├── routes.ts         # API route handlers
│   ├── replitAuth.ts     # Authentication setup
│   └── services/         # Business logic services
│       ├── receiptAnalyzer.ts  # AI receipt scanning
│       ├── receiptScanner.ts   # Gmail email processing
│       └── gmailService.ts     # Gmail API integration
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema and Zod validators
├── attached_assets/        # User-uploaded files
│   └── receipts/          # Receipt images
└── uploads/               # Temporary upload directory
```

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Initiate OIDC login
- `GET /api/callback` - OIDC callback
- `GET /api/logout` - Log out

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/stats` - Get project budget statistics
- `POST /api/projects` - Create new project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Cost Entries
- Timesheets: `/api/timesheets`
- Progress Reports: `/api/progress-reports`
- Equipment Logs: `/api/equipment`
- Materials: `/api/materials`
- Subcontractors: `/api/subcontractors`
- Overhead: `/api/overhead`

(Each supports GET, POST, PATCH, DELETE operations)

### Receipts
- `POST /api/receipts/upload` - Upload and analyze receipt image
- `GET /api/receipts/:filename` - Serve receipt image
- `GET /api/receipts/entry/:entryType/:entryId` - Get receipts for an entry

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/active` - List active employees only
- `POST /api/employees` - Create employee
- `PATCH /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Soft-delete employee

### Gmail Integration
- `GET /api/gmail-connection` - Get current Gmail connection
- `POST /api/gmail-connection` - Connect Gmail account
- `DELETE /api/gmail-connection` - Disconnect Gmail
- `POST /api/gmail-connection/sync` - Manually trigger email sync

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts (Replit Auth)
- `sessions` - Session storage (Replit Auth)
- `projects` - Construction projects with budget allocations
- `timesheets` - Daily labor cost entries
- `progress_reports` - Project completion tracking
- `materials` - Material quantities and costs
- `equipment_logs` - Equipment usage and costs
- `subcontractor_entries` - Third-party contractor costs
- `overhead_entries` - Administrative costs
- `receipts` - Uploaded receipt images with AI-extracted data
- `receipt_links` - Links receipts to cost entries (polymorphic)
- `employees` - Employee records with pay rates
- `gmail_connection` - Company Gmail inbox connection

## Features in Detail

### AI Receipt Scanning

Upload a receipt photo and the AI automatically extracts:
- Vendor/merchant name
- Purchase date
- Individual line items with descriptions and prices
- Subtotal, tax, and total amounts

This data auto-fills form fields, saving time and reducing errors.

### Gmail Integration

**Single Company Inbox Model**: 
1. Set up a dedicated company email (e.g., receipts@company.com)
2. Have employees forward receipt emails to this address
3. Connect the email once in the app
4. Receipts are automatically imported and matched to employees

This solves the OAuth token limitation while maintaining simplicity.

### Employee Management

- Track employee names, emails, and default hourly pay rates
- Auto-fill pay rates in timesheet forms
- Override rates for overtime or special situations
- Soft-delete maintains historical data integrity

## Development

### Type Safety

The application uses TypeScript throughout with:
- Shared Zod schemas for validation
- Drizzle ORM for type-safe database queries
- React Query for typed API responses

### Database Migrations

Use Drizzle Kit to manage schema changes:

```bash
# Push schema changes to database
npm run db:push

# Force push (if prompted about table renames)
npm run db:push -- --force
```

### Code Organization

- **Backend**: Thin route handlers delegate to storage layer
- **Storage Layer**: Single source of truth for data access
- **Frontend**: React Query handles all server state
- **Forms**: React Hook Form + Zod for validation

## Deployment

The application is designed to run on Replit with zero-config deployment:

1. Push code to your Replit workspace
2. Environment variables are auto-configured
3. Click "Run" and you're live

For other platforms, ensure:
- PostgreSQL database is accessible
- Environment variables are set
- Build step runs: `npm run build`
- Server starts with: `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open a GitHub issue
- Check existing documentation in `replit.md`
- Review code comments for implementation details

## Acknowledgments

- Built with [Replit](https://replit.com)
- UI components from [Shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- AI powered by [OpenAI GPT-4o Vision](https://openai.com)
