// 验证「自带密钥(BYOK)」链路:SecretId + SecretKey → listEnvs 列出环境 → 对指定环境生图
// 用途:确认用户自己(或同账号下其他)云开发环境的小程序成长计划资源包可用哪个生图模型 ID
//
// 用法:
//   node --env-file=.env.local scripts/tcb-test-byok.mjs --list
//       只列出该密钥能访问的全部环境(不消耗额度),默认行为
//   node --env-file=.env.local scripts/tcb-test-byok.mjs --env <envId> [--models m1,m2,...]
//       用指定环境 init,依次尝试候选模型各生成一张(每成功一张消耗 1 张额度),打印成功模型
// 密钥来源:环境变量 TCB_SECRET_ID / TCB_SECRET_KEY(用 --env-file=.env.local 或自行 export)
import CloudBase from '@cloudbase/manager-node'
import tcb from '@cloudbase/node-sdk'

const secretId = process.env.TCB_SECRET_ID
const secretKey = process.env.TCB_SECRET_KEY
if (!secretId || !secretKey) {
  console.error('缺少 TCB_SECRET_ID / TCB_SECRET_KEY 环境变量')
  process.exit(1)
}

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}

// ---- 1. 列环境(仅凭两个密钥,不需要 envId)----
const manager = new CloudBase({ secretId, secretKey })
const { EnvList = [] } = await manager.env.listEnvs()
console.log(`共 ${EnvList.length} 个环境:`)
for (const env of EnvList) {
  console.log(
    [
      `  envId=${env.EnvId}`,
      `alias=${env.Alias || '-'}`,
      `source=${env.Source || '-'}`,
      `status=${env.Status || '-'}`,
      `region=${env.Region || '-'}`
    ].join('  ')
  )
}

// ---- 2. 指定环境生图探测(默认不做,避免误烧额度)----
const envId = getArg('--env')
if (args.includes('--list') || !envId) {
  console.log('\n(仅列环境。如需实测生图: --env <envId> [--models m1,m2,...])')
  process.exit(0)
}

const targets = EnvList.filter((e) => e.EnvId === envId)
if (targets.length === 0) {
  console.error(`\n账号下没有找到环境 ${envId}，请先确认 --list 输出里的 envId`)
  process.exit(1)
}

const defaultModels = ['HY-Image-3.0-Plus-4090-Tob-v1.0']
const models = (getArg('--models') || defaultModels.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

console.log(`\n准备对 ${envId} 实测生图,候选模型: ${models.join(' | ')}`)
const app = tcb.init({ env: envId, secretId, secretKey, timeout: 120000 })
const imageModel = app.ai().createImageModel('hunyuan-image')

for (const model of models) {
  const t0 = Date.now()
  try {
    const res = await imageModel.generateImage({
      model,
      prompt: '一只橘色的猫趴在窗台上晒太阳,温暖阳光,摄影风格',
      size: '1024x1024'
    })
    const url = res?.data?.[0]?.url
    console.log(`  ✅ model=${model} 生成成功 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    console.log(`     URL: ${url ? url.slice(0, 120) : '(无 url,请检查返回)'}`)
    process.exit(0)
  } catch (err) {
    const code = err?.code ?? err?.response?.status ?? ''
    const msg = err?.message || String(err)
    console.log(`  ❌ model=${model} 失败 (${(Date.now() - t0) / 1000}s)`)
    console.log(`     code=${code}`)
    console.log(`     message=${msg.slice(0, 300)}`)
    // 4xx 属于该模型不可用/未开通,继续试下一个;网络类错误直接中断避免空等
    if (String(code).startsWith('5') || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
      console.error('  上游网络/服务异常,中断探测')
      break
    }
  }
}
console.error('\n所有候选模型均失败,请结合上方 code/message 判断:额度未开通 / 渠道模型名不符')
process.exit(1)
