import { createClient } from '@libsql/client'

/**
 * Turso 数据库客户端(服务端专用)
 * 凭据从环境变量读取:TURSO_URL / TURSO_AUTH_TOKEN
 */
let client: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url || !authToken) {
      throw new Error('缺少 TURSO_URL / TURSO_AUTH_TOKEN 环境变量')
    }
    client = createClient({ url, authToken })
  }
  return client
}
