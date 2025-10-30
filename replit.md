# BudgetSync Field

## Overview

BudgetSync Field is a construction project budget tracking application for field superintendents and project managers. It automates daily cost calculations from various inputs (timesheets, progress reports, equipment logs, materials, subcontractors, overhead) to provide real-time visibility into budget burn rates, remaining funds, and project completion projections. The application is a full-stack web application with a React frontend and Express backend, featuring offline capability considerations and a mobile-first, field-ready design. It also includes AI-powered receipt analysis using OpenAI GPT-4o Vision for automatic data extraction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The application uses Shadcn/ui components built on Radix UI with Tailwind CSS, following a "New York" style variant. The design prioritizes large touch targets, high contrast for outdoor readability, glanceable data presentation, rapid input, and clear offline sync status, inspired by construction management platforms like Procore and Fieldwire. It uses the Roboto font family.

### Technical Implementations

**Frontend**:
- **Framework**: React 18+ with TypeScript, using Vite.
- **State Management**: TanStack Query for server state; React hooks for local component state.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod for validation.
- **Styling**: Tailwind CSS with custom design tokens, supporting light/dark themes.
- **Performance**: React Query caching, Vite code splitting, optimized font loading, optimistic UI updates for instant feedback with rollback on errors.
- **Error Handling**: React Error Boundary for graceful component error handling.

**Backend**:
- **Runtime**: Node.js with Express.js framework, written in TypeScript.
- **API Design**: RESTful API with JSON responses, organized by resource.
- **Authentication**: Replit Auth (OpenID Connect) supporting Google, GitHub, and email/password. Uses PostgreSQL-backed sessions (`connect-pg-simple`). All API routes are protected with `isAuthenticated` middleware.
- **AI Integration**: OpenAI GPT-4o Vision for receipt analysis, integrated via Replit AI Integrations.
- **Atomic Operations**: Implemented database transactions for atomic progress report creation with inline materials.
- **Employee Management**: CRUD operations for employee tracking with pay rates.
- **Gmail Integration**: Single company inbox architecture for receipt processing, using PostgreSQL advisory locks for connection serialization.

**Monorepo Structure**: Frontend (`client/`), backend (`server/`), and shared code (`shared/`) ensure type consistency using TypeScript and shared Zod schemas.

### System Design Choices

**Data Storage**: PostgreSQL (Neon serverless platform) with Drizzle ORM for type-safe queries and schema management.
- **Schema**: Includes `Projects`, `Timesheets`, `Progress Reports`, `Materials`, `Equipment Logs`, `Subcontractor Entries`, `Overhead Entries`, `Receipts`, `Receipt Links`, `Employees`, `Users`, `Sessions`, and `Gmail Connection` tables. All use UUID primary keys and timestamps.
- **Connection Pooling**: Neon serverless connection pooling with WebSocket support.

**Build Strategy**: Vite for client (to `dist/public`), esbuild for server (to `dist/`).

**Responsive Design**: Mobile-first with Tailwind breakpoints for adaptable layouts.

## External Dependencies

### Frontend Libraries
- `@tanstack/react-query`: Server state management
- `wouter`: Routing
- `react-hook-form`: Form handling
- `zod`: Runtime validation
- `date-fns`: Date manipulation
- `lucide-react`: Icons
- `shadcn/ui` components (built on Radix UI)

### Backend Libraries
- `express`: Web framework
- `drizzle-orm`: ORM
- `@neondatabase/serverless`: PostgreSQL driver
- `ws`: WebSocket client
- `connect-pg-simple`: PostgreSQL session store

### Development Tools
- `vite`: Build tool/dev server
- `esbuild`: JS bundler
- `tsx`: TypeScript execution
- `drizzle-kit`: Migrations
- `tailwindcss`: CSS framework

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL platform.

### Design Resources
- **Google Fonts**: Roboto and Roboto Mono.

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`