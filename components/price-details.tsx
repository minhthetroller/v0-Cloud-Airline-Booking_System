"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PriceDetailsProps {
  flightId: string
  selectedClass: "economy" | "business" | null
  onClose: () => void
  onSelect: (fareType: string, price: number) => void
}

export default function PriceDetails({ flightId, selectedClass, onClose, onSelect }: PriceDetailsProps) {
  const [selectedFare, setSelectedFare] = useState<string | null>(null)

  if (!selectedClass) return null

  const isEconomy = selectedClass === "economy"

  // Get destination image based on route (in a real app, this would be dynamic)
  const destinationImage = {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/los_angeles.jpg-WsfM3OwitTxdQcj4JZujQFCPne7l1H.jpeg",
    alt: "Los Angeles",
  }

  // Fare options based on selected class
  const fareOptions = isEconomy
    ? [
        { type: "Basic", price: 11473000 },
        { type: "Full", price: 18124000 },
      ]
    : [{ type: "Business", price: 28373000 }]

  const handleSelectFare = (type: string, price: number) => {
    setSelectedFare(type)
    onSelect(type, price)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  // Darker version of the description color for prices
  const priceColor = "#8a6a56" // Darker than #aa846e

  return (
    <div className="w-full overflow-hidden transition-all duration-300 bg-[#f7e9e0]">
      <div className="container mx-auto px-4 py-6">
        <div className="flex">
          {/* Destination image sidebar */}
          <div className="hidden w-1/5 pr-4 md:block h-full">
            <div className="relative h-full">
              <Image
                src={destinationImage.src || "/placeholder.svg"}
                alt={destinationImage.alt}
                fill
                className="object-cover"
                style={{ position: "absolute", height: "100%" }}
              />
            </div>
          </div>

          {/* Fare options */}
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="flex w-full items-center justify-between pb-2">
              <h2 className="text-xl font-bold text-[#0f2d3c]">{isEconomy ? "Economy Options" : "Business Options"}</h2>
              <div className="text-right">
                <span className="text-sm text-[#aa846e]">Product comparison</span>
                <Info className="ml-2 inline-block h-5 w-5 cursor-pointer text-[#aa846e]" />
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
              {/* Fare options */}
              {fareOptions.map((fare) => (
                <div key={fare.type} className="rounded-lg bg-[#f5f0ea] p-4">
                  <div className="mb-2 rounded bg-[#0f2d3c] px-2 py-1 text-center text-sm font-medium text-white">
                    {fare.type}
                  </div>
                  <div className="mb-4 text-center text-xl font-bold text-[#8a6a56]">
                    VND {formatCurrency(fare.price)}
                  </div>
                  <Button
                    className="w-full bg-[#fef7f1] text-[#0f2d3c] border-2 border-[#0f2d3c] hover:bg-[#fef7f1]/90"
                    onClick={() => handleSelectFare(fare.type, fare.price)}
                  >
                    Select
                  </Button>

                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-[#0f2d3c]">Booking Class</div>
                      <div className="text-[#aa846e]">HAN-TPE: Economy{isEconomy ? "(L)" : "(H)"}</div>
                      <div className="text-[#aa846e]">TPE-KIX: Economy{isEconomy ? "(L)" : "(H)"}</div>
                    </div>

                    <div>
                      <div className="flex items-center font-medium text-[#0f2d3c]">
                        Seat Selection <Info className="ml-1 h-4 w-4 text-[#0f2d3c]" />
                      </div>
                      <div className="text-[#aa846e]">Complimentary For Forward And Standard Seats</div>
                    </div>

                    <div>
                      <div className="flex items-center font-medium text-[#0f2d3c]">
                        Checked Baggage <Info className="ml-1 h-4 w-4 text-[#0f2d3c]" />
                      </div>
                      <div className="text-[#aa846e]">First Piece: Free</div>
                      <div className="text-[#aa846e]">Second Piece: Free</div>
                      <div className="text-[#aa846e]">Each Piece 23 Kg (50 Lbs)</div>
                    </div>

                    <div>
                      <div className="flex items-center font-medium text-[#0f2d3c]">
                        COSMILE Mileage Accrual <Info className="ml-1 h-4 w-4 text-[#0f2d3c]" />
                      </div>
                      <div className="text-[#aa846e]">{isEconomy ? "1668" : "2086"}</div>
                    </div>

                    <div>
                      <div className="font-medium text-[#0f2d3c]">COSMILE Upgrade Award</div>
                      <div className="text-[#aa846e]">Applicable</div>
                    </div>

                    <div>
                      <div className="font-medium text-[#0f2d3c]">Reissue Fee(Each Time)</div>
                      <div className="text-[#aa846e]">{isEconomy ? "USD 30" : "Free"}</div>
                    </div>

                    <div>
                      <div className="font-medium text-[#0f2d3c]">Refund Fee</div>
                      <div className="text-[#aa846e]">{isEconomy ? "USD 100" : "USD 50"}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Business class option for economy selection */}
              {isEconomy && (
                <div className="rounded-lg bg-[#f5f0ea] p-4 flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-video overflow-hidden rounded-lg mb-4">
                      <Image
                        src="/placeholder.svg?height=200&width=300"
                        alt="Business Class Seat"
                        width={300}
                        height={200}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="text-left text-xl font-bold text-[#0f2d3c]">Business</div>
                    <div className="text-left text-[#aa846e]">Enjoy more comfortable space</div>
                  </div>

                  <div className="mt-auto">
                    <div className="text-left text-xl font-bold text-[#8a6a56] mt-4">VND 28,373,000</div>
                    <Button
                      className="mt-4 w-full bg-[#fef7f1] text-[#0f2d3c] border-2 border-[#0f2d3c] hover:bg-[#fef7f1]/90"
                      onClick={() => onSelect("Business", 28373000)}
                    >
                      Select <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
