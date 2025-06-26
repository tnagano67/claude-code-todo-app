# Todo App

A modern Todo application built with React Router v7, SQLite, and deployed on Cloudflare Workers.

# Tech Stack

- Frontend: React Router v7 with TypeScript
- Database: SQLite with D1 (Cloudflare Workers)
- Testing: Vitest for unit tests, Playwright for e2e testing
- Deployment: Cloudflare Workers
- Runtime: Workerd (Cloudflare Workers runtime)

# Commands

- npm install: Install dependencies
- npm run dev: Start development server
- npm run build: Build the application for production
- npm run preview: Preview production build locally
- npm test: Run unit tests with Vitest
- npm run test:watch: Run tests in watch mode
- npm run test:e2e: Run end-to-end tests with Playwright
- npm run test:e2e:ui: Run Playwright tests with UI mode
- npm run typecheck: Run TypeScript type checking
- npm run lint: Run ESLint
- npm run deploy: Deploy to Cloudflare Workers

# Code Style

- Use TypeScript for all new code
- Use ES modules (import/export) syntax
- Prefer function declarations over arrow functions for components
- Use 2-space indentation
- Use double quotes for strings
- Add types for all function parameters and return values
- Use React Router v7 conventions for routing and data loading

# Development Workflow

- Run typecheck before committing changes
- Test both unit and e2e tests before major changes
- Use feature branches: feature/description
- Use fix branches: fix/description
- Test locally with `npm run preview` before deploying

# Database

- Uses SQLite with Cloudflare D1 for production
- Local development uses SQLite file
- Database schema managed through migrations
- Use prepared statements for all queries

# Testing Strategy

- Unit tests for business logic and utilities
- Component tests for React components
- E2e tests for critical user workflows
- Test database operations with in-memory SQLite
- Mock external APIs in tests

# Deployment

- Production: Cloudflare Workers via `npm run deploy`
- Database: Cloudflare D1 (SQLite)
- Static assets: Served from Cloudflare Workers
- Environment variables configured in wrangler.toml and Cloudflare dashboard

# Project Structure

- `/app` - React Router v7 application code
- `/app/routes` - Route components and loaders
- `/app/components` - Reusable React components
- `/app/lib` - Utility functions and database operations
- `/app/types` - TypeScript type definitions
- `/tests` - Test files (unit and e2e)
- `/migrations` - Database migration files
