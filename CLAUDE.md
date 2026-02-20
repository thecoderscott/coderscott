# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check (tsc -b) then bundle
npm run lint      # Run ESLint
npm run preview   # Serve the production build locally
```

There is no test runner configured.

## Architecture

**React 19 + TypeScript + Vite SPA** scaffolded from the Vite React-TS template.

Entry point chain: `index.html` → `src/main.tsx` → `src/App.tsx` (mounted inside `React.StrictMode`).

Custom hooks live in `src/hooks/`.

**TypeScript** is strict (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`, `erasableSyntaxOnly`). The tsconfig uses project references: `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`.

**ESLint** uses the flat config format (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`.
