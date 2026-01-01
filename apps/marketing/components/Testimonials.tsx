'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Product Designer',
    avatar: '/avatars/avatar-1.png',
    content: 'Prophet has transformed how I work. Having Claude AI right in my browser sidebar means I can get instant help without breaking my flow.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Software Engineer',
    avatar: '/avatars/avatar-2.png',
    content: 'The credit system is fair and transparent. I know exactly what I\'m paying for, and the free tier was perfect for trying it out.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Content Writer',
    avatar: '/avatars/avatar-3.png',
    content: 'Best AI assistant extension I\'ve used. The responses are fast, accurate, and the interface is beautifully designed.',
    rating: 5,
  },
  {
    name: 'David Park',
    role: 'Marketing Manager',
    avatar: '/avatars/avatar-4.png',
    content: 'Prophet helps me draft emails, create content ideas, and analyze data without switching between tabs. It\'s a game-changer.',
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Users</h2>
          <p className="text-lg text-muted-foreground">
            See what our users have to say about Prophet
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative px-12"
        >
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                        ))}
                      </div>

                      <p className="text-muted-foreground mb-6 flex-1">
                        &quot;{testimonial.content}&quot;
                      </p>

                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                          <AvatarFallback>
                            {testimonial.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{testimonial.name}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </motion.div>
      </div>
    </section>
  )
}
