import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * O main.tsx importa o MSW e o app de forma dinâmica (o app precisa do worker
 * ativo antes de renderizar). Sem ajuda, o navegador só descobre esses chunks
 * depois de executar o main: este plugin os anuncia no HTML com modulepreload,
 * e o download corre em paralelo desde o início.
 */
function preloadBootChunks(entries: string[]): Plugin {
  return {
    name: 'kurio:preload-boot-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const files = new Set<string>()
        const visit = (fileName: string) => {
          const chunk = bundle[fileName]
          if (!chunk || chunk.type !== 'chunk' || files.has(fileName)) return
          files.add(fileName)
          chunk.imports.forEach(visit)
        }
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && entries.some((entry) => chunk.facadeModuleId?.endsWith(entry))) visit(chunk.fileName)
        }
        const tags = [...files]
          .filter((file) => !html.includes(file))
          .map((file) => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` }, injectTo: 'head' as const }))
        return { html, tags }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Precisa vir antes do plugin do React para gerar a árvore de rotas
    // e dividir cada rota em um chunk próprio.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadBootChunks(['src/mocks/browser.ts', 'src/app/app.tsx']),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // O MSW só precisa de `getDomain` do tldts (via tough-cookie): a versão mínima
      // tira do bundle a lista de sufixos públicos (ver src/mocks/stubs/tldts.ts).
      tldts: fileURLToPath(new URL('./src/mocks/stubs/tldts.ts', import.meta.url)),
    },
  },
})
