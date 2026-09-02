import './Tutorial.css'

const STEPS = [
  {
    title: '登录 Gitee AI 平台',
    desc: '打开下方链接并登录你的 Gitee 账号：',
    link: 'https://ai.gitee.com/serverless-api',
    img: 'https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260901-114704-pcrs.png'
  },
  {
    title: '选择一个模型',
    desc: '下滑页面，随便点开一个模型进入详情页，点击「在线体验」。',
    img: 'https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260901-114812-72nk.png'
  },
  {
    title: '添加令牌并复制',
    desc: '点击「API」→「添加令牌」，下方代码中的星号会变成你的令牌，复制该值即可回到本页面使用。',
    img: 'https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260901-115033-kbmw.png'
  }
]

export default function Tutorial() {
  return (
    <section className="tutorial" id="tutorial">
      <div className="container">
        <div className="section-header">
          <h2>使用教程</h2>
          <p>三步获取免费访问令牌，开始你的 AI 创作</p>
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
                  <div className="step-screenshot placeholder">
                    （截图待补充）
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="tutorial-tip">
          <span className="tip-icon">💡</span>
          <p>
            令牌是免费体验访问令牌，每天有 100 张免费生成额度，2K 分辨率，无任何限制。
            注意：账号绑定手机号，请保护个人隐私，勿随意分享你的令牌。
          </p>
        </div>
      </div>
    </section>
  )
}