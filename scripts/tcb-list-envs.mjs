// 列出腾讯云账号下的 CloudBase 环境,用于查找 TCB_ENV_ID
// 用法: node --env-file=.env.local scripts/tcb-list-envs.mjs
import CloudBase from '@cloudbase/manager-node'

const secretId = process.env.TCB_SECRET_ID
const secretKey = process.env.TCB_SECRET_KEY
if (!secretId || !secretKey) {
  console.error('缺少 TCB_SECRET_ID / TCB_SECRET_KEY 环境变量')
  process.exit(1)
}

const app = new CloudBase({ secretId, secretKey })
const { EnvList = [] } = await app.env.listEnvs()

for (const env of EnvList) {
  console.log(
    [
      `envId=${env.EnvId}`,
      `alias=${env.Alias || '-'}`,
      `source=${env.Source || '-'}`,
      `status=${env.Status || '-'}`,
      `region=${env.Region || '-'}`
    ].join('  ')
  )
}
if (EnvList.length === 0) console.log('该账号下没有找到任何云开发环境')
