"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function SuccessPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-[#f8f5f2] rounded-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-[#0f2d3c] mb-4">Registration Successful!</h1>

        <p className="text-[#0f2d3c] mb-8">
          Welcome to COSMILE! Your account has been successfully created. You can now enjoy all the benefits of being a
          STARLUX Airlines member.
        </p>

        <div className="space-y-4">
          <Button onClick={() => router.push("/")} className="w-full bg-[#8a7a4e] hover:bg-[#8a7a4e]/90 text-white">
            Go to Homepage
          </Button>

          <Button
            onClick={() => router.push("/profile")}
            variant="outline"
            className="w-full border-[#8a7a4e] text-[#8a7a4e]"
          >
            View My Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
