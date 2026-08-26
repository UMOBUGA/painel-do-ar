import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Helper só de teste (mora em `_lib` porque o Vercel ignora pastas com "_" ao
 * montar as rotas de `api/`, então isso nunca vira um endpoint por engano).
 * Os handlers só leem `req.url`/`req.headers` e chamam
 * `res.setHeader`/`res.end`, então um objeto plano é suficiente — não precisa
 * de um socket real por trás de `IncomingMessage`/`ServerResponse`.
 */
export function mockReq(url: string, headers: Record<string, string> = {}): IncomingMessage {
  return { url, headers } as unknown as IncomingMessage
}

export interface MockRes {
  statusCode: number
  headers: Record<string, string>
  body: unknown
}

export function mockRes(): ServerResponse & MockRes {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(key: string, value: string) {
      res.headers[key] = value
      return res
    },
    end(chunk?: string) {
      if (chunk) res.body = JSON.parse(chunk)
      return res
    },
  }
  return res as unknown as ServerResponse & MockRes
}
