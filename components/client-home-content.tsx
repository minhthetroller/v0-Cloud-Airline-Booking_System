"use client"

import { useState } from "react"
import BookingForm from "@/components/booking-form"
import LoginModal from "@/components/login-modal"
import { useRouter } from "next/navigation"
import supabaseClient from "@/lib/supabase"

export default function ClientHomeContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut()
    router.refresh()
  }

  return (
    <>
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

      {/* Sign In button that's only rendered on the client */}
      <div className="container mx-auto px-4 -mt-8 mb-8 flex justify-end">
        <button onClick={() => setIsLoginModalOpen(true)} className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
          Sign In
        </button>
      </div>
    </>
  )
}
