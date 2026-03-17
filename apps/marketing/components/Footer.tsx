import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8 mb-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="text-2xl font-bold mb-4 block">
              Prophet
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered Chrome extension. Chat with Claude AI and boost productivity from your browser side panel.
            </p>
            <p className="text-sm text-muted-foreground">
              <a href="mailto:kazakis.th@gmail.com" className="hover:text-foreground transition">kazakis.th@gmail.com</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-foreground transition">Features</a></li>
              <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
              <li><a href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif" className="hover:text-foreground transition">Add to Chrome</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/use-cases" className="hover:text-foreground transition">Use Cases</Link></li>
              <li><Link href="/integrations" className="hover:text-foreground transition">Integrations</Link></li>
              <li><Link href="/for/developers" className="hover:text-foreground transition">For Developers</Link></li>
              <li><Link href="/for/students" className="hover:text-foreground transition">For Students</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/how-it-works" className="hover:text-foreground transition">How It Works</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
              <li><Link href="/guides" className="hover:text-foreground transition">Guides</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Compare</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/best-ai-chrome-extensions" className="hover:text-foreground transition">Best AI Chrome Extensions</Link></li>
              <li><Link href="/compare/prophet-vs-claude-in-chrome" className="hover:text-foreground transition">Prophet vs Claude in Chrome</Link></li>
              <li><Link href="/compare/prophet-vs-sider" className="hover:text-foreground transition">Prophet vs Sider</Link></li>
              <li><Link href="/compare" className="hover:text-foreground transition">All Comparisons</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition">About</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition">Terms</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Tools</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/tools/ai-api-cost-calculator" className="hover:text-foreground transition">AI Cost Calculator</Link></li>
              <li><Link href="/tools/ai-model-comparison" className="hover:text-foreground transition">Model Comparison</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1"></div>
          <p className="text-sm text-muted-foreground text-center md:text-center">
            &copy; {currentYear} Prophet. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground flex-1 md:justify-end">
            <a href="https://x.com/KazakisThanos" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
              X
            </a>
            <a href="https://github.com/ThanosKa/prophet" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
              GitHub
            </a>
            <a href="https://discord.gg/2YV53RbS" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
