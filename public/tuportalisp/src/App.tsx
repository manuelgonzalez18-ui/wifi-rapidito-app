import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StatsBar } from './components/StatsBar';
import { ProblemSolution } from './components/ProblemSolution';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { ROISection } from './components/ROISection';
import { Testimonials } from './components/Testimonials';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { ContactForm } from './components/ContactForm';
import { Footer } from './components/Footer';
import { WhatsAppBubble } from './components/WhatsAppBubble';

export function App() {
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-400/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-fuchsia-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <StatsBar />
          <ProblemSolution />
          <Features />
          <HowItWorks />
          <ROISection />
          <Testimonials />
          <Pricing />
          <FAQ />
          <ContactForm />
        </main>
        <Footer />
        <WhatsAppBubble />
      </div>
    </div>
  );
}
