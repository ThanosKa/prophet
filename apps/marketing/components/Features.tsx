export function Features() {
  const features = [
    {
      title: 'Always Available',
      description: 'Access Claude from any website without leaving your browser',
    },
    {
      title: 'Streaming Responses',
      description: 'See AI responses stream in real-time as they are generated',
    },
    {
      title: 'Chat History',
      description: 'Keep track of all your conversations with persistent storage',
    },
    {
      title: 'Secure Authentication',
      description: 'Your data is protected with Clerk authentication and secure APIs',
    },
    {
      title: 'Token-Based Credits',
      description: 'Pay only for what you use with our transparent credit system',
    },
    {
      title: 'Multiple Tiers',
      description: 'Choose the plan that fits your needs - from Free to Ultra',
    },
  ]

  return (
    <section id="features" className="py-20 px-4 bg-muted/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 rounded-lg bg-card border">
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
