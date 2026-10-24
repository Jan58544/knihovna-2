# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Spuštění a nasazení

Pro lokální vývoj použijte Node.js 24 a příkazy `npm ci` a `npm run dev`.
Kontroly: `npm run lint`, `npm test` a `npm run build`.

Aplikace se nasazuje přes GitHub Actions do GitHub Pages po pushi do `main`.
Workflow **Deploy to GitHub Pages** lze spustit také ručně přes **Actions →
Deploy to GitHub Pages → Run workflow**, větev `main`. V nastavení repozitáře
**Settings → Pages → Build and deployment → Source** musí být vybráno
**GitHub Actions**. Úspěšný běh zobrazí odkaz na aplikaci v souhrnu a u prostředí
`github-pages`.

Očekávaná adresa: https://jan58544.github.io/knihovna-2/
Je dostupná až po úspěšném nasazení. Vyhledávání knih potřebuje přístup
k veřejným externím službám; skenování kamerou vyžaduje povolení prohlížeče.
