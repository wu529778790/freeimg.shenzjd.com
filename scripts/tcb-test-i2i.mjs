// 验证图生图(I2I)调用形态:先文生图拿一张图,再以 base64 垫图做图生图
// 用法: node --env-file=.env.local scripts/tcb-test-i2i.mjs
import tcb from '@cloudbase/node-sdk'

const app = tcb.init({
  env: process.env.TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  timeout: 180000
})
const imageModel = app.ai().createImageModel('hunyuan-image')

// 1. 先文生图一张垫图
const t0 = Date.now()
const t2i = await imageModel.generateImage({
  model: 'HY-Image-3.0-Plus-4090-Tob-v1.0',
  prompt: '一只简笔画风格的小狗,白色背景,线条简单',
  size: '1024x1024'
})
const srcUrl = t2i?.data?.[0]?.url
console.log(`垫图生成 ${((Date.now() - t0) / 1000).toFixed(1)}s`)

// 2. 下载转 base64(去掉 data URL 前缀的裸 base64)
const buf = Buffer.from(await (await fetch(srcUrl)).arrayBuffer())
const b64 = buf.toString('base64')
console.log(`垫图 ${(buf.length / 1024).toFixed(0)}KB`)

// 3. 图生图
const t1 = Date.now()
try {
  const i2i = await imageModel.generateImage({
    model: 'HY-Image-v3.0-I2I-ToB-v1.0.1',
    prompt: '把这只小狗变成 3D 皮克斯渲染风格,保持姿势和构图不变',
    images: [b64]
  })
  console.log(`图生图 ${((Date.now() - t1) / 1000).toFixed(1)}s`)
  console.log('返回 keys:', Object.keys(i2i))
  console.log('URL:', i2i?.data?.[0]?.url?.slice(0, 120))
} catch (err) {
  console.error('裸 base64 失败:', err.response?.status || '', err.response?.data || err.message)
  // 4. 重试:带 data URL 前缀
  try {
    const t2 = Date.now()
    const i2i2 = await imageModel.generateImage({
      model: 'HY-Image-v3.0-I2I-ToB-v1.0.1',
      prompt: '把这只小狗变成 3D 皮克斯渲染风格,保持姿势和构图不变',
      images: ['data:image/png;base64,' + b64]
    })
    console.log(`带前缀成功 ${((Date.now() - t2) / 1000).toFixed(1)}s, URL:`, i2i2?.data?.[0]?.url?.slice(0, 120))
  } catch (e2) {
    console.error('带前缀也失败:', e2.response?.status || '', e2.response?.data || e2.message)
    process.exitCode = 1
  }
}
