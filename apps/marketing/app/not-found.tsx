import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function NotFound() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="space-y-6 max-w-md mx-auto">
                    {/* 404 Visual */}
                    <div className="relative">
                        <h1 className="text-[150px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/20 select-none">
                            404
                        </h1>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-full h-full bg-background/10 backdrop-blur-[1px]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Page not found
                        </h2>
                        <p className="text-muted-foreground">
                            The page you are looking for doesn't exist or has been moved.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button
                            asChild
                            size="lg"
                            className="transition-all duration-200 ease-out hover:shadow-lg"
                        >
                            <Link href="/">
                                Return Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
