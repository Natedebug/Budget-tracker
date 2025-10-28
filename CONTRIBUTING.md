# Contributing to BudgetSync Field

Thank you for your interest in contributing to BudgetSync Field! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/budgetsync-field.git
   cd budgetsync-field
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up your environment** (see `.env.example`)
5. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Making Changes

1. Make your changes in your feature branch
2. Follow the existing code style and conventions
3. Add or update tests as needed
4. Update documentation if you're changing behavior

### Code Style

- **TypeScript**: We use TypeScript throughout the project
- **Formatting**: Code is auto-formatted (consider adding Prettier)
- **Naming**: Use descriptive names for variables, functions, and components
- **Comments**: Add comments for complex logic, but prefer self-documenting code

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add receipt auto-categorization
fix: correct budget calculation for overtime
docs: update API endpoint documentation
refactor: simplify material tracking logic
test: add tests for Gmail integration
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Testing

Before submitting a pull request:

1. **Type check**: `npx tsc --noEmit`
2. **Build**: `npm run build`
3. **Test manually**: Run the app and test your changes
4. **Check logs**: Ensure no errors in browser console or server logs

### Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Add a description** explaining what and why
3. **Link related issues** using keywords like "Fixes #123"
4. **Wait for review** - maintainers will review your PR
5. **Address feedback** if requested

## Project Architecture

### Frontend (`client/`)
- React + TypeScript
- Wouter for routing
- TanStack Query for server state
- Shadcn/ui + Tailwind CSS for UI

### Backend (`server/`)
- Express + TypeScript
- Drizzle ORM for database
- Replit Auth for authentication
- OpenAI for receipt scanning

### Shared (`shared/`)
- Database schema definitions
- Zod validation schemas
- Shared TypeScript types

## Areas for Contribution

### Good First Issues
- UI/UX improvements
- Documentation updates
- Bug fixes
- Additional validation

### Feature Ideas
- Export formats (Excel, PDF)
- Budget forecasting
- Mobile app (React Native)
- Offline sync
- Real-time collaboration
- Advanced reporting

### Technical Improvements
- Unit/integration tests
- Performance optimizations
- Accessibility enhancements
- Error handling
- Logging improvements

## Code Review Guidelines

When reviewing pull requests, consider:

1. **Functionality**: Does it work as intended?
2. **Code Quality**: Is it readable and maintainable?
3. **Performance**: Are there any bottlenecks?
4. **Security**: Are there any vulnerabilities?
5. **Tests**: Are there adequate tests?
6. **Documentation**: Is it documented?

## Questions?

If you have questions:
- Open a GitHub Discussion
- Check existing issues and PRs
- Read the documentation in `README.md` and `replit.md`

## Code of Conduct

Be respectful and constructive in all interactions. We're building this together!

---

Thank you for contributing to BudgetSync Field! 🚀
