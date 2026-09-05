# card-vault

A minimal React + Vite starter for the card-vault project, with HMR and a basic ESLint setup. Use this repository as the foundation for building the card-vault web UI.

Live demo: https://card-vault-blush.vercel.app/

React plugin options:
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) (uses Oxc)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) (uses SWC)

## Features
- Fast dev server with Hot Module Replacement (HMR)
- Opinionated ESLint rules for consistent code style
- Ready-to-use Vite build configuration
- Small footprint to iterate quickly

## Requirements
- Node.js 16+ (Node 18+ recommended)
- npm or yarn

## Quick start

1. Clone the repo
   ```bash
   git clone https://github.com/mderum/card-vault.git
   cd card-vault
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the dev server
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   Open http://localhost:5173 (or the URL printed in the terminal).

4. Build for production
   ```bash
   npm run build
   # or
   yarn build
   ```

5. Preview the production build locally
   ```bash
   npm run preview
   # or
   yarn preview
   ```

## Scripts
- dev — Start Vite dev server with HMR
- build — Create a production build
- preview — Serve the production build locally
- lint — Run ESLint
- format — Run formatter (if configured)

(Adjust script names above if your package.json uses different commands.)

## React Compiler
The React Compiler is not enabled by default due to its impact on dev/build performance. If you want to enable it, follow React's documentation: https://react.dev/learn/react-compiler/installation

## ESLint and TypeScript
For production apps we recommend using TypeScript plus type-aware lint rules. Consider switching to a TypeScript template or enabling `@typescript-eslint` and configuring ESLint to run with type-aware rules for better safety and developer experience.

## Environment & Configuration
If your app needs API keys or runtime configuration, add a `.env` (or `.env.local`) and document required variables here. Example:

```
VITE_API_URL=https://api.example.com
```

## Contributing
Contributions, bug reports, and pull requests are welcome. Please add a short description of the feature/bug and include steps to reproduce or test.

## License
Add your license here (e.g., MIT). If you don't yet have one, consider adding one to clarify usage rights.
