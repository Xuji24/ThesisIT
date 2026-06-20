const PARTNERS = ['Klarna', 'Haier', 'SAMSUNG', 'CANON', 'TOYOTA', 'Panasonic'];

export default function PartnerLogos() {
  return (
    <section className="border-t border-neutral-100 py-10 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
        {PARTNERS.map((name) => (
          <span
            key={name}
            className="text-sm md:text-base font-semibold tracking-wide text-neutral-300 select-none"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
