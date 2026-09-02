// 实测:1) 超 500 字的长 prompt 是否直接可生图(SDK 文档称上限 8192 字符)
//      2) footnote 传空串/空格能否去掉右下角默认水印
// 用法: node --env-file=.env.local scripts/tcb-test-footnote.mjs
import tcb from '@cloudbase/node-sdk'
import sharp from 'sharp'

const app = tcb.init({
  env: process.env.TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  timeout: 240000
})
const imageModel = app.ai().createImageModel('hunyuan-image')

const gen = async (name, params) => {
  const t = Date.now()
  try {
    const res = await imageModel.generateImage({
      model: 'HY-Image-3.0-Plus-4090-Tob-v1.0',
      size: '1024x1024',
      ...params
    })
    const url = res?.data?.[0]?.url
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
    // 裁右下角 500x100 区域看水印
    const img = sharp(buf)
    const meta = await img.metadata()
    const crop = await img
      .extract({ left: meta.width - 500, top: meta.height - 100, width: 500, height: 100 })
      .png()
      .toFile(`/tmp/wm-${name}.png`)
    console.log(`[OK] ${name} (${((Date.now() - t) / 1000).toFixed(1)}s) 右下角已存 /tmp/wm-${name}.png`)
  } catch (err) {
    const d = err.response?.data
    console.log(`[FAIL] ${name}: ${err.response?.status} ${typeof d === 'object' ? JSON.stringify(d).slice(0, 200) : String(d || err.message).slice(0, 200)}`)
  }
}

// 1. 长 prompt(约 800 字符,不精简直接生图)
const longPrompt =
  '杰作,绝妙构图，电影质感,获奖作品,32K高清画质,32K细腻真人皮肤纹理,背景虚化,前景虚化,超现实少女，立体骨相魅惑眼神，冷白皮粉底液蜜桃般的细腻肌肤,及腰长发，卡姿兰大眼长睫毛,丹凤眼,胶片摄影,对焦模糊,高曝,overexposure,暗调,伦勃朗光,强烈明暗对比,高反差,山海经龙族公主,dragon_horns,冷白皮粉底液,白蓝金渐变色,妖冶,魅惑,长流苏，长发飘起,肌理质感,情绪氛围感拉满,孤傲,奇特视角,胶片颗粒感，慢快门,朦胧美学,层次感,蓝白曝光,白化发光苍白粉嫩的肌肤,黄金比例身材,华丽的饰品和纹理,'.repeat(4)
console.log(`长 prompt 测试: ${longPrompt.length} 字符`)
await gen('long-prompt', { prompt: longPrompt, revise: { value: false } })

// 2~4. footnote 三种形态(固定 seed 便于对比)
await gen('no-footnote', { prompt: '一只橘猫坐在窗台上看夕阳,摄影风格', seed: 42 })
await gen('empty-footnote', { prompt: '一只橘猫坐在窗台上看夕阳,摄影风格', seed: 42, footnote: '' })
await gen('space-footnote', { prompt: '一只橘猫坐在窗台上看夕阳,摄影风格', seed: 42, footnote: ' ' })
