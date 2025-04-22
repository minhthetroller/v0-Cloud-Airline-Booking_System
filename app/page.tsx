"use client"

import { useState } from "react"
import Image from "next/image"
import BookingForm from "@/components/booking-form"
import LoginModal from "@/components/login-modal"
import { useRouter } from "next/navigation"
import Link from "next/link"
import supabaseClient from "@/lib/supabase"

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut()
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="STARLUX Airlines Logo" width={180} height={60} className="h-8 w-auto" />
          </div>
          <nav className="hidden md:block">
            <ul className="flex gap-6">
              <li>
                <a href="#" className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  My Bookings
                </a>
              </li>
              <li>
                <a href="#" className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  Check-in
                </a>
              </li>
              <li>
                <a href="#" className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="hidden text-[#0f2d3c] hover:text-[#0f2d3c]/80 md:block"
            >
              Sign In
            </button>
            <Link href="/register" className="rounded-full bg-[#0f2d3c] px-4 py-2 text-white hover:bg-[#0f2d3c]/90">
              Register
            </Link>
          </div>
        </header>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Full-width blue section */}
      <section className="mb-12 w-full bg-[#0f2d3c] py-8">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-3xl font-bold text-white">Book Your Flight</h2>
          <p className="mb-6 text-white">Find the best deals on flights to your favorite destinations</p>
          <BookingForm />
        </div>
      </section>

      <div className="container mx-auto px-4">
        <section className="mb-12 grid gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">Special Offers</h3>
            <p className="text-gray-600">Discover our latest promotions and discounts on flights worldwide.</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              View Offers →
            </a>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">Travel Destinations</h3>
            <p className="text-gray-600">Explore popular destinations and get inspired for your next trip.</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              Explore →
            </a>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">Travel Guide</h3>
            <p className="text-gray-600">Get helpful tips and information to make your journey smoother.</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              Read More →
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
