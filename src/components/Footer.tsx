import { Phone, MapPin } from 'lucide-react';

const contacts = [
  { name: 'IMRAN KHAN', phone: '8390090038' },
  { name: 'SADIQ KHAN', phone: '9359458298' },
  { name: 'DILSHAD KHAN', phone: '9356720070' },
];

export default function Footer() {
  return (
    <footer className="gradient-primary text-primary-foreground mt-auto">
      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Brand */}
          <div className="animate-fade-in">
            <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Sadik Traders</h3>
            <p className="text-xs opacity-80 mt-1">Wholesale & Retail — Dry Fruits & Spices</p>
            <p className="text-xs opacity-60 italic">Since 1989</p>
          </div>

          {/* Contact */}
          <div className="animate-fade-in">
            <h4 className="font-semibold text-sm mb-2" style={{ fontFamily: 'var(--font-display)' }}>Contact Us</h4>
            <div className="space-y-1.5">
              {contacts.map(c => (
                <a
                  key={c.phone}
                  href={`tel:+91${c.phone}`}
                  className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200"
                >
                  <Phone size={12} /> {c.name} — {c.phone}
                </a>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="animate-fade-in">
            <h4 className="font-semibold text-sm mb-2" style={{ fontFamily: 'var(--font-display)' }}>Visit Us</h4>
            <div className="flex items-start gap-2 text-sm opacity-80">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>Sadik Traders, Wholesale Market</span>
            </div>
            <p className="text-xs opacity-60 mt-2 italic">Visit Again, Thank You!</p>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-4 pt-4 text-center">
          <p className="text-xs opacity-60">© {new Date().getFullYear()} Sadik Traders. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
