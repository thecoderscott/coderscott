# &lt;CS/&gt; - coderscott

Personal portfolio site for coderscott — Senior Frontend Engineer.

Built with **React 19 + TypeScript + Vite**.

## Stack

- **React 19** with strict mode
- **TypeScript** (strict, project references)
- **Vite** for dev server and bundling
- **lucide-react** for icons
- CSS Modules for component-scoped styles
- WebGL canvas for the animated hero grid background

## Project Structure

```
src/
├── components/
│   ├── Header/       # Responsive nav with burger toggle
│   └── Hero/         # Landing section with WebGL grid + avatar
├── hooks/
│   ├── useDebounce.ts
│   └── useWebGLGrid.ts
└── assets/
```

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check then bundle
npm run lint      # Run ESLint
npm run preview   # Serve the production build locally
```
