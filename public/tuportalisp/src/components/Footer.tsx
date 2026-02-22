import { Wifi, Instagram, Facebook, Linkedin, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="pt-16 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center gap-2 text-white no-underline mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-dark-900" />
              </div>
              <span className="font-display font-900 text-lg tracking-tight">
                TUPORTAL<span className="text-cyan-400">ISP</span>
              </span>
            </a>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              Automatizamos la cara digital de tu ISP para que tú te enfoques en brindar la mejor conexión.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Instagram, href: '#' },
                { icon: Facebook, href: '#' },
                { icon: Linkedin, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-400/20 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-700 text-sm uppercase tracking-wider mb-5">Producto</h4>
            <ul className="space-y-3">
              {['Funciones', 'Cómo Funciona', 'Precios', 'FAQ'].map((label) => (
                <li key={label}>
                  <a href={`#${label.toLowerCase().replace(/\s/g, '-').replace('ó', 'o')}`} className="text-slate-500 hover:text-cyan-400 transition-colors text-sm">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-700 text-sm uppercase tracking-wider mb-5">Recursos</h4>
            <ul className="space-y-3">
              {[
                { label: 'Ver Demo', href: 'https://www.wifirapidito.com' },
                { label: 'Wisphub', href: 'https://wisphub.net' },
                { label: 'Blog', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-cyan-400 transition-colors text-sm">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-700 text-sm uppercase tracking-wider mb-5">Contacto</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/584120330315"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-cyan-400 transition-colors text-sm"
                >
                  WhatsApp: +58 412 033 0315
                </a>
              </li>
              <li className="text-slate-500 text-sm">Atención 24/7</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-slate-600 text-xs flex items-center justify-center gap-1">
            © {new Date().getFullYear()} TuPortalISP. Hecho con{' '}
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> para ISPs de LATAM.
          </p>
        </div>
      </div>
    </footer>
  );
}
