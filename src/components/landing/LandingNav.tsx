import { Button } from '@/components/ui/button';

const NAV_LINKS = ['Home', 'About', 'Features', 'Pricing', 'Contact'];

interface LandingNavProps {
  onGetStarted?: () => void;
}

export default function LandingNav({ onGetStarted }: LandingNavProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
      <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 lg:px-8 py-4">
        <a href="/" className="text-lg font-semibold text-neutral-900 tracking-tight">
          ThesisIT
        </a>

        <ul className="hidden md:flex items-center gap-8 text-sm text-neutral-600">
          {NAV_LINKS.map((label) => (
            <li key={label}>
              <a href={`#${label.toLowerCase()}`} className="hover:text-neutral-900 transition-colors">
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" className="hidden sm:inline-flex">
            Sign In
          </Button>
          <Button variant="default" onClick={onGetStarted}>
            Sign Up
          </Button>
        </div>
      </nav>
    </header>
  );
}
