// 定位 422 是否为内容审核:用原始 705 字提示词与历史精简输出逐字测试
// 用法: node --env-file=.env.local scripts/tcb-test-moderation.mjs
import tcb from '@cloudbase/node-sdk'
import { readFileSync } from 'node:fs'

const app = tcb.init({
  env: process.env.TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  timeout: 180000
})
const imageModel = app.ai().createImageModel('hunyuan-image')

const original =
  '杰作,绝妙构图，电影质感,获奖作品,32K高清画质,32K细腻真人皮肤纹理,背景虚化,前景虚化,超现实少女，立体骨相魅惑眼神，冷白皮粉底液蜜桃般的细腻肌肤,及腰长发，卡姿兰大眼长睫毛,丹凤眼,胶片摄影,对焦模糊,高曝,overexposure,暗调,伦勃朗光,强烈明暗对比,高反差,山海经龙族公主,dragon_horns,冷白皮粉底液,白蓝金渐变色,妖冶,魅惑,长流苏，长发飘起,肌理质感,情绪氛围感拉满,孤傲,奇特视角,胶片颗粒感，慢快门,朦胧美学,层次感,蓝白曝光,白化发光苍白粉嫩的肌肤,黄金比例身材,华丽的饰品和纹理'
const condensed = readFileSync('/tmp/condense-out.txt', 'utf8').trim()

const cases = [
  { name: `原始705字提示词(${original.length}字)`, prompt: original },
  { name: `自动精简输出(${condensed.length}字)`, prompt: condensed }
]

for (const c of cases) {
  const t = Date.now()
  try {
    const res = await imageModel.generateImage({
      model: 'HY-Image-3.0-Plus-4090-Tob-v1.0',
      prompt: c.prompt,
      size: '1024x1024',
      revise: { value: true }
    })
    console.log(`[OK] ${c.name} (${((Date.now() - t) / 1000).toFixed(1)}s)`)
  } catch (err) {
    const d = err.response?.data
    console.log(`[FAIL] ${c.name}: ${err.response?.status} ${typeof d === 'object' ? JSON.stringify(d).slice(0, 400) : String(d || err.message).slice(0, 400)}`)
  }
}
