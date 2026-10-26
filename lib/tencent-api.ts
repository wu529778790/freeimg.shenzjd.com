import crypto from 'node:crypto'

/**
 * 腾讯云 API 轻量调用(TC3-HMAC-SHA256 签名,零第三方依赖)。
 *
 * 为什么不用 @cloudbase/manager-node:
 * 它只为「列一个环境列表」这一个功能而被引入,但实测加载后 RSS 常驻 +60MB
 * (整个包带 cos-nodejs-sdk、uuid、query-string 等一大串依赖)。线上 9-25~10-26
 * 全量日志里 /api/ai/envs 一共只被调了 92 次 —— 为 92 次调用常年占 60MB 不值。
 * 这里按官方签名规范手写,只用 node:crypto,加载成本可以忽略。
 */

const TCB_ENDPOINT = 'https://tcb.tencentcloudapi.com'
const TCB_SERVICE = 'tcb'
const TCB_VERSION = '2018-06-08'
/** tcb 接口是全局型,region 仅参与签名头;与 manager-node 默认值保持一致 */
const TCB_REGION = process.env.TCB_REGION || 'ap-shanghai'

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function hmac(key: crypto.BinaryLike, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg).digest()
}

/** UTC 日期 YYYY-MM-DD(签名要求 UTC,不能用本地时区) */
function utcDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export interface TcbApiError extends Error {
  code?: string
  requestId?: string
}

/**
 * 调用一个腾讯云 API,返回 Response 段。
 * 失败(网络/超时/上游 Error)一律抛错,由调用方决定对外话术。
 */
export async function callTencentApi<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
  secretId: string,
  secretKey: string,
  timeoutMs = 15000
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000)
  const date = utcDate(timestamp)
  const body = JSON.stringify(payload)
  const payloadHash = sha256Hex(body)

  // 规范请求串:固定只签 content-type 与 host,顺序必须按字典序
  const canonicalHeaders = `content-type:application/json\nhost:tcb.tencentcloudapi.com\n`
  const signedHeaders = 'content-type;host'
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')

  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    `${date}/${TCB_SERVICE}/tc3_request`,
    sha256Hex(canonicalRequest)
  ].join('\n')

  const kDate = hmac(`TC3${secretKey}`, date)
  const kService = hmac(kDate, TCB_SERVICE)
  const kSigning = hmac(kService, 'tc3_request')
  const signature = hmac(kSigning, stringToSign).toString('hex')

  const authorization =
    `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${TCB_SERVICE}/tc3_request, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(TCB_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
      'X-TC-Action': action,
      'X-TC-Version': TCB_VERSION,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': TCB_REGION
    },
    body,
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!res.ok) {
    const err: TcbApiError = new Error(`腾讯云接口 HTTP ${res.status}`)
    throw err
  }

  const json = (await res.json()) as {
    Response?: { Error?: { Code?: string; Message?: string }; RequestId?: string }
  } & T

  const upstreamError = json.Response?.Error
  if (upstreamError) {
    const err: TcbApiError = new Error(upstreamError.Message || '腾讯云接口返回错误')
    err.code = upstreamError.Code
    err.requestId = json.Response?.RequestId
    throw err
  }

  return json.Response as unknown as T
}

/** 环境列表项(与 manager-node 的 IListEnvRes.EnvList 字段对齐) */
export interface TcbEnvItem {
  EnvId?: string
  Alias?: string
  Source?: string
  Status?: string
  Region?: string
}

/** 列出该密钥可访问的云开发环境(DescribeEnvs) */
export async function describeEnvs(
  secretId: string,
  secretKey: string
): Promise<TcbEnvItem[]> {
  const res = await callTencentApi<{ EnvList?: TcbEnvItem[] }>(
    'DescribeEnvs',
    {},
    secretId,
    secretKey
  )
  return res.EnvList || []
}
