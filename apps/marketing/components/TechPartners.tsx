const partners = ['Anthropic (Claude AI)', 'Stripe', 'Clerk', 'Supabase']

export function TechPartners() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm text-muted-foreground mb-4">Built with</p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {partners.map((partner) => (
            <span key={partner} className="text-sm font-medium text-muted-foreground">
              {partner}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
