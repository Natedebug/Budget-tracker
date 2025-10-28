# BudgetSync Field

## Overview

BudgetSync Field is a construction project budget tracking application designed for field superintendents and project managers. The application automatically calculates and updates project costs daily based on inputs from timesheets, progress reports, equipment logs, material entries, subcontractor entries, and overhead costs. It provides real-time visibility into budget burn rates, remaining funds, and project completion projections.

The application is built as a full-stack web application with a React-based frontend and an Express backend, featuring offline capability considerations and a mobile-first, field-ready design approach.

## Recent Changes

**October 28, 2025**: 
- ✅ **Replit Auth Integration**: Added complete authentication system
  - Implemented OIDC authentication with multiple login providers (Google, GitHub, email/password)
  - Added PostgreSQL-backed session management
  - Created users and sessions database tables
  - Protected all API routes with authentication middleware
  - Built construction-themed landing page for unauthenticated users
  - Added user profile display with avatar and logout functionality
  - End-to-end authentication testing completed successfully

- ✅ **Atomic Progress Report Creation**: Implemented database transaction support for progress reports with inline materials
  - Created `createProgressReportWithMaterials()` storage method using `db.transaction()` for ACID guarantees
  - Enhanced progress report form with dynamic material entry fields (add/remove materials)
  - Single API call creates both progress report and all materials atomically
  - Complete rollback on any failure - no orphaned data
  - Materials properly calculated and displayed in dashboard cost breakdown
  - End-to-end testing confirmed atomic creation with proper database transaction behavior

- ✅ **AI-Powered Receipt Upload and Analysis**: Implemented complete receipt scanning with automatic data extraction
  - Integrated OpenAI GPT-4o Vision for receipt image analysis
  - Created receipts and receipt_links database tables for polymorphic entry linking
  - Built file upload infrastructure with multer (JPG/PNG support, 10MB limit)
  - Receipt analyzer service extracts vendor, date, line items, totals, tax from images
  - Mobile-friendly ReceiptUploader component with camera capture and drag-drop
  - Auto-fill form fields from receipt data across all entry types (materials, equipment, subcontractors, overhead)
  - Progress reports can create multiple material rows from receipt line items
  - Receipt linking system supports attaching multiple receipts to entries
  - Image preview and serving with ReceiptPreview component
  - Field mapping standardized between backend analyzer and frontend (price/total/unit/quantity)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, using Vite as the build tool and development server.

**UI Component System**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling. This provides a consistent, accessible component library following the "New York" style variant.

**Design System**: Hybrid approach combining Material Design foundations (Roboto font family) with construction management best practices inspired by Procore and Fieldwire. The design prioritizes:
- Large touch targets for field use
- High contrast for outdoor readability  
- Glanceable data presentation
- Rapid input with minimal taps
- Clear offline sync status indicators

**State Management**: TanStack Query (React Query) for server state management, data fetching, caching, and synchronization. Local component state managed with React hooks.

**Routing**: Wouter for lightweight client-side routing without the overhead of React Router.

**Form Handling**: React Hook Form with Zod schema validation for type-safe form validation and data handling.

**Styling**: Tailwind CSS with custom design tokens for colors, spacing, and typography. Supports light/dark themes with CSS variables for dynamic theming.

### Backend Architecture

**Runtime**: Node.js with Express.js framework.

**Language**: TypeScript for type safety across the entire application.

**API Design**: RESTful API with JSON responses. Routes organized by resource (projects, timesheets, progress reports, equipment logs, subcontractor entries, overhead entries, materials).

**Request Handling**: Express middleware for JSON parsing, URL encoding, request logging, and response time tracking.

**Development Server**: Vite middleware integration for hot module replacement during development, with production builds serving static assets.

### Data Storage

**Database**: PostgreSQL (via Neon serverless platform) for production-grade relational data storage.

**ORM**: Drizzle ORM for type-safe database queries and schema management. Provides:
- Type-safe query builder
- Schema migrations
- Relationship mapping
- Zod schema generation for validation

**Schema Design**: 
- **Projects**: Core entity containing budget allocations across categories (labor, materials, equipment, subcontractors, overhead)
- **Timesheets**: Daily labor cost tracking with employee hours and pay rates
- **Progress Reports**: Project completion percentage tracking with associated material usage
- **Materials**: Linked to progress reports for material quantity and cost tracking
- **Equipment Logs**: Equipment hours, fuel costs, and rental expenses
- **Subcontractor Entries**: Third-party contractor costs
- **Overhead Entries**: Administrative and indirect costs

All tables use UUID primary keys and include created timestamps. Foreign keys enforce referential integrity with cascade deletes.

**Connection Pooling**: Neon serverless connection pooling with WebSocket support for efficient database connections.

### Authentication and Authorization

**Authentication Provider**: Replit Auth (OpenID Connect) with support for multiple login methods:
- Google OAuth
- GitHub OAuth
- Email/password
- Other OIDC providers

**Session Management**: PostgreSQL-backed sessions using `connect-pg-simple` with 1-week TTL. Sessions stored in `sessions` table with automatic cleanup.

**User Management**: Users stored in `users` table with profile information (email, name, profile image) synced from OIDC claims. Users automatically created/updated on login via upsert operation.

**Frontend Auth Flow**:
- Unauthenticated users see landing page with login button
- Login redirects to `/api/login` → OIDC flow → callback → authenticated dashboard
- `useAuth()` hook provides user state, loading status, and authentication status
- 401 responses treated as "not authenticated" (not errors)
- User profile displayed in header with avatar, name, and logout button

**Backend Protection**:
- All API routes protected with `isAuthenticated` middleware
- Protected routes: `/api/projects`, `/api/timesheets`, `/api/progress-reports`, `/api/equipment`, `/api/subcontractors`, `/api/overhead`, `/api/materials`
- Unauthenticated requests return 401 Unauthorized
- Session refresh handled automatically via OIDC token refresh

**Security Features**:
- CSRF protection via session cookies
- Secure session cookies (httpOnly, sameSite)
- Token refresh for long-running sessions
- No client-side secret storage

### Key Architectural Decisions

**Monorepo Structure**: Frontend (`client/`), backend (`server/`), and shared code (`shared/`) in a single repository. Shared schema definitions ensure type consistency between frontend and backend.

**Type Safety**: End-to-end TypeScript with shared Zod schemas for runtime validation and TypeScript type generation. This eliminates type mismatches between API contracts and database schemas.

**Path Aliases**: Configured for clean imports:
- `@/` for client-side code
- `@shared/` for shared types and schemas
- `@assets/` for static assets

**Build Strategy**: 
- Client builds to `dist/public` via Vite
- Server bundles to `dist/` via esbuild with external package references
- Production serves pre-built static files from Express

**Responsive Design**: Mobile-first approach with Tailwind breakpoints:
- Base: Single column mobile layout
- md: 2-column tablet layout  
- lg: 3-column desktop layout

**Performance Optimization**:
- React Query caching with infinite stale time
- No automatic refetching to reduce server load
- Vite code splitting and tree shaking
- Optimized font loading via Google Fonts CDN

## External Dependencies

### Frontend Libraries
- **@tanstack/react-query**: Server state management and data fetching
- **wouter**: Lightweight routing
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Zod resolver integration
- **zod**: Runtime type validation
- **date-fns**: Date formatting and manipulation
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class merging utility
- **cmdk**: Command menu component
- **embla-carousel-react**: Carousel functionality

### UI Component Libraries (Radix UI)
Complete set of unstyled, accessible UI primitives including dialogs, dropdowns, popovers, accordions, tooltips, and form controls.

### Backend Libraries
- **express**: Web application framework
- **drizzle-orm**: Type-safe ORM
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **ws**: WebSocket client for database connections
- **connect-pg-simple**: PostgreSQL session store (for future auth implementation)

### Development Tools
- **vite**: Build tool and dev server
- **@vitejs/plugin-react**: React integration for Vite
- **esbuild**: JavaScript bundler for server code
- **tsx**: TypeScript execution for development
- **drizzle-kit**: Database migration and schema management
- **tailwindcss**: Utility-first CSS framework
- **autoprefixer**: CSS vendor prefixing
- **postcss**: CSS processing

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL platform providing managed database hosting with connection pooling and WebSocket support.

### Design Resources
- **Google Fonts**: Roboto and Roboto Mono font families for professional construction industry aesthetic.

### Replit-Specific Integrations
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Project structure visualization
- **@replit/vite-plugin-dev-banner**: Development environment indicator