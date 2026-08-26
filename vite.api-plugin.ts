import type { Plugin, ViteDevServer } from 'vite'

/**
 * Em produção o Vercel serve `/api/*` como funções serverless a partir dos
 * arquivos em `api/`, sem nenhuma configuração — é convenção de arquivo. Em
 * dev, `vite` sozinho não sabe nada sobre essa pasta; este plugin fecha essa
 * lacuna montando os mesmos três handlers como middleware do dev server,
 * usando `ssrLoadModule` para que o TypeScript seja transformado on-the-fly
 * como qualquer outro módulo do projeto.
 *
 * É uma tabela explícita de rotas, não um roteador genérico: só existem 3
 * endpoints, e generalizar isso seria complexidade sem uso real.
 */
const ROUTES: { pattern: RegExp; file: string }[] = [
  { pattern: /^\/api\/ranking\/?$/, file: '/api/ranking.ts' },
  { pattern: /^\/api\/history\/[^/]+\/?$/, file: '/api/history/[cityId].ts' },
  { pattern: /^\/api\/cron\/snapshot\/?$/, file: '/api/cron/snapshot.ts' },
]

export function apiDevPlugin(): Plugin {
  return {
    name: 'painel-do-ar:api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0] ?? ''
        const route = ROUTES.find((r) => r.pattern.test(pathname))
        if (!route) {
          next()
          return
        }

        try {
          const mod = await server.ssrLoadModule(route.file)
          await mod.default(req, res)
        } catch (error) {
          next(error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
  }
}
