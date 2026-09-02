// 混元页使用教程:与首页 Tutorial 同构(复用 Tutorial.css 全部样式)
// 教用户三步领取资源包(含创建环境)、配密钥、开始生成
import './Tutorial.css'

const STEPS = [
  {
    title: '领取「小程序成长计划」资源包并创建环境',
    desc:
      '访问微信公众平台「行业能力 → 小程序成长计划」领取资源包（10 亿 Token + 10 万张 AI 生图，6 个月有效）；'
      + '领取后点击「去使用」，起个名字创建一个云开发环境，资源包即绑定到这个环境上，后续生成请都选它。',
    link: 'https://developers.weixin.qq.com/minigame/dev/wxcloud/billing/ai-inspire-plan.html',
    img: 'https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260902-161023-h9k2.png'
  },
  {
    title: '获取腾讯云 API 密钥',
    desc:
      '登录腾讯云控制台「访问管理 → API 密钥管理」，点击「新建密钥」并完成验证，复制 SecretId 与 SecretKey（请勿泄露给他人）。',
    link: 'https://console.cloud.tencent.com/cam/capi',
    img: 'https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260902-161156-adlk.png'
  },
  {
    title: '在本页填入密钥并选择刚才创建的环境',
    desc:
      '点击页面顶部「配置你的腾讯云密钥（生成必填）」，粘贴 SecretId / SecretKey，点「加载我的环境」，'
      + '在下拉里选择第 1 步创建好的那个云开发环境，输入提示词即可开始生成。',
    img: 'https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260902-161655-dys5.png'
  }
]

export default function HunyuanHelp() {
  return (
    <section className="tutorial" id="tutorial">
      <div className="container">
        <div className="section-header">
          <h2>使用教程</h2>
          <p>三步配置你自己的免费额度，开始 AI 创作</p>
        </div>

        <div className="tutorial-steps">
          {STEPS.map((step, index) => (
            <div className="tutorial-step" key={step.title}>
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                {step.link && (
                  <a
                    className="step-link"
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {step.link} ↗
                  </a>
                )}
                {step.img ? (
                  <div className="step-screenshot">
                    <img src={step.img} alt={step.title} loading="lazy" />
                  </div>
                ) : (
                  <div className="step-screenshot placeholder">（截图待补充）</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="tutorial-tip">
          <span className="tip-icon">💡</span>
          <p>
            密钥仅保存在你自己的浏览器 localStorage；生成请求会把它发给本站服务器代调用你的云开发环境，
            服务端不落库、不打日志。额度来自你自己环境的「小程序成长计划」资源包，请勿把密钥分享给他人。
          </p>
        </div>
      </div>
    </section>
  )
}