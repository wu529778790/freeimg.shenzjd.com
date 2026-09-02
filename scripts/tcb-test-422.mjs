// 复现 422:定位 revise 参数形态与内容审核哪一个是触发源
// 用法: node --env-file=.env.local scripts/tcb-test-422.mjs
import tcb from '@cloudbase/node-sdk'

const app = tcb.init({
  env: process.env.TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  timeout: 180000
})
const imageModel = app.ai().createImageModel('hunyuan-image')

const cases = [
  { name: 'revise:{value:true} + 普通提示词', params: { prompt: '一只橘猫在草地上晒太阳', size: '1024x1024', revise: { value: true } } },
  { name: 'revise:true(布尔) + 普通提示词', params: { prompt: '一只橘猫在草地上晒太阳', size: '1024x1024', revise: true } },
  { name: 'revise:{value:true} + 龙族公主长提示词', params: { prompt: '电影质感获奖杰作，32K高清细腻画质，超现实山海经龙族公主特写肖像。少女呈黄金比例身材，冷白皮如蜜桃般白化发光苍白粉嫩，肌肤纹理与真人骨相立体，卡姿兰大眼配长睫毛与丹凤眼，魅惑孤傲眼神。及腰长发飘起，头生白蓝金渐变龙角，戴华丽流苏饰品，衣饰纹样繁复。伦勃朗光切入暗调，强烈明暗对比高反差，蓝白曝光轻微过曝，前景背景虚化。胶片摄影慢快门，颗粒朦胧美学', size: '1024x1024', revise: { value: true } } }
]

for (const c of cases) {
  const t = Date.now()
  try {
    const res = await imageModel.generateImage({ model: 'HY-Image-3.0-Plus-4090-Tob-v1.0', ...c.params })
    console.log(`[OK] ${c.name} (${((Date.now() - t) / 1000).toFixed(1)}s) url=${(res?.data?.[0]?.url || '').slice(0, 60)}`)
  } catch (err) {
    const detail = err.response?.data
    console.log(`[FAIL] ${c.name}: ${err.response?.status || ''} ${typeof detail === 'object' ? JSON.stringify(detail).slice(0, 300) : String(detail || err.message).slice(0, 300)}`)
  }
}
