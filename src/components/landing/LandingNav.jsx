const NAV_LINKS = ['Home', 'About', 'Features', 'Pricing', 'Contact'];

export default function LandingNav({ onGetStarted }) {
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
          <button
            type="button"
            className="hidden sm:inline-flex px-5 py-2.5 text-sm font-medium rounded-full border border-neutral-900 text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="px-5 py-2.5 text-sm font-medium rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </nav>
    </header>
  );
}
