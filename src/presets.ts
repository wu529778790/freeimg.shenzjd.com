import { SIZE_OPTIONS } from './config'
import type { SizeOption } from './types'

// 预设风格定义
export interface StylePreset {
  id: string
  name: string
  description: string
  platform: string
  // 附加在用户提示词之后的风格描述（最终发送给模型的 Prompt）
  stylePrompt: string
  // 推荐的图片尺寸
  recommendedSize: SizeOption
}

const findSize = (label: string): SizeOption =>
  SIZE_OPTIONS.find((s) => s.label === label)!

// 预设风格列表（参考 baoyu-skills 的分类方式：风格 × 布局 × 配色 → 场景化预设）
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'wechat-cover',
    name: '公众号封面',
    description: '商务现代扁平插画，适合文章头图',
    platform: '微信公众号',
    recommendedSize: findSize('16:9'),
    stylePrompt: `请以"微信公众号文章封面图"的规格来呈现：
- 构图：扁平插画风格（flat vector illustration），主体视觉居中或偏左，右侧预留干净区域用于放标题文字
- 配色：以深蓝 #1E3A5F 与米白 #F7F5F0 为主色，金色 #C9A227 点缀，低饱和渐变背景
- 元素：简洁几何图形与图标，避免复杂纹理，突出核心概念
- 排版：画面若包含文字，使用大号无衬线字体，标题不超过 8 个字，保持 40% 以上留白
- 氛围：专业、现代、高级感`
  },
  {
    id: 'wechat-knowledge-card',
    name: '知识卡片',
    description: '手绘线条干货风，适合知识讲解',
    platform: '微信公众号',
    recommendedSize: findSize('1:1'),
    stylePrompt: `请以"知识卡片/干货图解"的规格来呈现：
- 风格：极简手绘线条风（notion 风格，hand-drawn line art），单色墨线、轻微抖动的手绘感
- 配色：黑白灰为主（#1A1A1A / #4A4A4A），背景纯白或纸纹理 #FAFAFA，点缀马卡龙浅蓝 #A8D4F0、浅黄 #F9E79F
- 元素：手绘小图标、箭头、圆圈标注、简单几何图形，大量留白
- 排版：内容分层清晰，可采用小标题 + 要点列表的结构
- 氛围：清爽、专业、有学习感`
  },
  {
    id: 'xhs-cover',
    name: '小红书封面',
    description: '少女感奶油配色，适合种草分享',
    platform: '小红书',
    recommendedSize: findSize('3:4'),
    stylePrompt: `请以"小红书种草封面图"的规格来呈现：
- 风格：甜美少女风（cute），圆润可爱的造型，贴纸感
- 配色：奶油色底 #FFFAF0，粉 #FED7E2、蜜桃 #FEEBC8、薄荷 #C6F6D5、薰衣草 #E9D8FD，点缀亮粉 #FF69B4
- 元素：爱心、星星、闪光、小花等贴纸元素，柔和渐变背景
- 排版：主体居中，上方或下方留出标题空间，标题可配泡泡字/高亮底色
- 氛围：治愈、可爱、有分享欲`
  },
  {
    id: 'xhs-quote',
    name: '金句卡片',
    description: '极简大留白，突出文字力量',
    platform: '小红书',
    recommendedSize: findSize('3:4'),
    stylePrompt: `请以"金句卡片/极简排版"的规格来呈现：
- 风格：极简风（minimal），单一视觉焦点，60% 以上留白
- 配色：黑白灰 + 单一强调色（如红色 #E8655A），低饱和
- 元素：少量几何元素点缀，无复杂背景
- 排版：画面主体是文字（如金句、标题），居中大号排版，字体优雅有设计感
- 氛围：克制、高级、有力量`
  },
  {
    id: 'xhs-cards',
    name: '图文卡片',
    description: '活力贴纸风，适合多图拆解',
    platform: '小红书',
    recommendedSize: findSize('3:4'),
    stylePrompt: `请以"小红书图文卡片"的规格来呈现：
- 风格：活力插画风（pop），色彩鲜艳、视觉冲击力强
- 配色：高饱和撞色（如橙 #FF7A00、电光蓝 #3A86FF、亮黄 #FFD60A），深色底或浅色底均可
- 元素：粗描边贴纸、对话框、箭头、星星爆炸元素，俏皮可爱
- 排版：内容分块清晰，信息密度适中，可包含要点数字标记
- 氛围：热闹、有趣、抓眼球`
  },
  {
    id: 'poster',
    name: '海报封面',
    description: '丝网印刷质感，电影感海报',
    platform: '通用风格',
    recommendedSize: findSize('3:2'),
    stylePrompt: `请以"电影海报/丝网印刷海报"的规格来呈现：
- 风格：丝网印刷风（screen-print），半调网纹质感，色块分明
- 配色：限量配色（2-4 色），如深蓝 + 橙红 + 米白，或复古三色套印
- 元素：象征性剪影、大块面图形、戏剧化构图、中心或对称布局
- 排版：标题大号粗体，可带副标题，文字与图形相互咬合
- 氛围：文艺、复古、有戏剧张力`
  },
  {
    id: 'hand-drawn',
    name: '手绘涂鸦',
    description: '手账感涂鸦插画，轻松随意',
    platform: '通用风格',
    recommendedSize: findSize('1:1'),
    stylePrompt: `请以"手绘涂鸦插画"的规格来呈现：
- 风格：手绘涂鸦风（hand-drawn doodle），笔触随意自然，像手账涂鸦
- 配色：暖色系（奶油底 + 棕/橙/薄荷点缀），彩笔上色感
- 元素：手绘箭头、圈圈、虚线、星星、涂改痕迹、便利贴感
- 排版：自由排布，元素错落有致，可带手写体标注
- 氛围：轻松、亲切、有温度`
  },
  {
    id: 'retro',
    name: '复古胶片',
    description: '复古胶片质感，怀旧氛围',
    platform: '通用风格',
    recommendedSize: findSize('1:1'),
    stylePrompt: `请以"复古胶片风"的规格来呈现：
- 风格：复古胶片风（retro/vintage），颗粒感、褪色、暖调
- 配色：焦糖棕 #C05621、复古橙 #ED8936、奶油黄 #F6AD55、暗红 #D4A09A，做旧底色
- 元素：胶片颗粒、漏光、柔焦、老旧相框、复古版式元素
- 排版：可带复古衬线字体或老式海报排版
- 氛围：怀旧、温暖、有年代故事感`
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    description: '霓虹夜景，未来科技感',
    platform: '通用风格',
    recommendedSize: findSize('16:9'),
    stylePrompt: `请以"赛博朋克风"的规格来呈现：
- 风格：赛博朋克（cyberpunk），未来都市夜景，霓虹灯光
- 配色：深紫黑底 #1A1025，电光青 #00F5FF、霓虹品红 #FF00FF、荧光绿 #39FF14 点缀
- 元素：全息投影、雨夜街道、摩天楼群、机械义体、发光线条
- 排版：可带故障艺术（glitch）文字效果
- 氛围：炫酷、未来、张力十足`
  },
  {
    id: 'watercolor',
    name: '水彩插画',
    description: '柔和水彩晕染，文艺治愈',
    platform: '通用风格',
    recommendedSize: findSize('1:1'),
    stylePrompt: `请以"水彩插画"的规格来呈现：
- 风格：水彩插画风（watercolor），柔和晕染、通透层次
- 配色：大地色系（陶土 #C05621、橄榄绿、米色）+ 低饱和蓝，自然清新
- 元素：颜料晕染边缘、留白飞白、轻微纸纹，植物/风景/生活器物均可
- 排版：画面整体轻盈，元素边缘柔和
- 氛围：文艺、治愈、呼吸感`
  },
  {
    id: '3d-cartoon',
    name: '3D 卡通',
    description: '3D 渲染卡通，质感圆润',
    platform: '通用风格',
    recommendedSize: findSize('1:1'),
    stylePrompt: `请以"3D 卡通渲染"的规格来呈现：
- 风格：3D 卡通渲染（3D render, Pixar 风格），圆润饱满、材质质感好
- 配色：明亮干净的糖果色系，柔和高光与投影
- 元素：圆角几何体、可爱的拟人化角色、柔软材质（布、硅胶感）
- 排版：主体居中，背景简洁渐变或虚化场景
- 氛围：可爱、精致、现代`
  },
  {
    id: 'chinese-style',
    name: '中国风国潮',
    description: '国潮插画，传统元素现代表达',
    platform: '通用风格',
    recommendedSize: findSize('1:1'),
    stylePrompt: `请以"中国风国潮插画"的规格来呈现：
- 风格：国潮插画（guochao），传统元素 + 现代平面设计
- 配色：朱红 #C8102E、鎏金 #C9A227、黛青 #2F4F6F、米白底，浓郁但不刺眼
- 元素：祥云、山水、印章、剪纸、传统纹样，与现代几何结合
- 排版：对称构图或中心构图，可带印章式文字
- 氛围：大气、东方美学、高级感`
  }
]
