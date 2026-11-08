import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { CycleStory } from "@/components/landing/CycleStory";
import { Anonymity } from "@/components/landing/Anonymity";
import { Profiles } from "@/components/landing/Profiles";
import { Competencies } from "@/components/landing/Competencies";
import { ClientLink } from "@/components/landing/ClientLink";
import { Facts } from "@/components/landing/Facts";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer } from "@/components/landing/Closing";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <CycleStory />
        <Anonymity />
        <Profiles />
        <Competencies />
        <ClientLink />
        <Facts />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
