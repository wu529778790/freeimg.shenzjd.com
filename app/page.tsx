import Hero from '@/src/components/Hero'
import GeneratorSection from '@/src/components/GeneratorSection'
import Tutorial from '@/src/components/Tutorial'
import SectionNav from '@/src/components/SectionNav'

// 工具优先:Hero 紧凑带过,实际生图紧随其后,使用教程收尾
export default function HomePage() {
  return (
    <>
      <SectionNav />
      <Hero />
      <GeneratorSection />
      <Tutorial />
    </>
  )
}
