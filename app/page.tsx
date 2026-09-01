import Hero from '@/src/components/Hero'
import Features from '@/src/components/Features'
import GeneratorSection from '@/src/components/GeneratorSection'
import HotPrompts from '@/src/components/HotPrompts'
import Tutorial from '@/src/components/Tutorial'
import { getHotPrompts } from '@/lib/prompts'
import type { PromptItem } from '@/src/types'

// 首页动态渲染(热门提示词实时查 Turso)
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let hotPrompts: PromptItem[] = []
  try {
    hotPrompts = await getHotPrompts(8)
  } catch (err) {
    console.error('加载热门提示词失败:', err)
  }

  return (
    <>
      <Hero />
      <Features />
      <GeneratorSection />
      <HotPrompts prompts={hotPrompts} />
      <Tutorial />
    </>
  )
}
