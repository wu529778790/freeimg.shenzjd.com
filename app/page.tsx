import Hero from '@/src/components/Hero'
import Features from '@/src/components/Features'
import GeneratorSection from '@/src/components/GeneratorSection'
import Tutorial from '@/src/components/Tutorial'
import SectionNav from '@/src/components/SectionNav'

// 工具优先:Hero 紧凑带过,实际生图紧随其后,宣传性的功能特性往后放
export default function HomePage() {
  return (
    <>
      <SectionNav />
      <Hero />
      <GeneratorSection />
      <Features />
      <Tutorial />
    </>
  )
}
