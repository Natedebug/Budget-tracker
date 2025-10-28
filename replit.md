# BudgetSync Field

## Overview

BudgetSync Field is a construction project budget tracking application designed for field superintendents and project managers. The application automatically calculates and updates project costs daily based on inputs from timesheets, progress reports, equipment logs, material entries, subcontractor entries, and overhead costs. It provides real-time visibility into budget burn rates, remaining funds, and project completion projections.

The application is built as a full-stack web application with a React-based frontend and an Express backend, featuring offline capability considerations and a mobile-first, field-ready design approach.

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

Currently not implemented. The application assumes single-user or trusted environment usage. Future implementation would require session management and user authentication middleware.

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