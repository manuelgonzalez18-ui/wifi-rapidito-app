import { useState, useEffect } from 'react';
import { Wifi, Menu, X, Zap } from 'lucide-react';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Funciones', href: '#features' },
    { label: 'Cómo Funciona', href: '#how-it-works' },
    { label: 'Precios', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'py-3 bg-dark-900/90 backdrop-blur-xl border-b border-white/5'
          : 'py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
        <a href="#" className="flex items-center gap-2 text-white no-underline group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all">
            <Wifi className="w-5 h-5 text-dark-900" />
          </div>
          <span className="font-display font-900 text-xl tracking-tight">
            TUPORTAL<span className="text-cyan-400">ISP</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium tracking-wide uppercase"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-dark-900 font-bold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-0.5 transition-all uppercase tracking-wider"
          >
            <Zap className="w-4 h-4" />
            Empezar Ahora
          </a>
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden glass mt-2 mx-4 rounded-2xl p-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium uppercase py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-dark-900 font-bold text-sm rounded-xl uppercase tracking-wider mt-2"
            onClick={() => setMenuOpen(false)}
          >
            <Zap className="w-4 h-4" />
            Empezar Ahora
          </a>
        </div>
      )}
    </header>
  );
}
