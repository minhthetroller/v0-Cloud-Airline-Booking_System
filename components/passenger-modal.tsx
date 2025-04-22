"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export interface PassengerDetails {
  adults: number
  children: number
  infants: number
  travelClass: string
}

interface PassengerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (details: PassengerDetails) => void
  initialDetails: PassengerDetails
}

export default function PassengerModal({ isOpen, onClose, onConfirm, initialDetails }: PassengerModalProps) {
  const [adults, setAdults] = useState(initialDetails.adults)
  const [children, setChildren] = useState(initialDetails.children)
  const [infants, setInfants] = useState(initialDetails.infants)
  const [travelClass, setTravelClass] = useState(initialDetails.travelClass)

  const handleConfirm = () => {
    onConfirm({
      adults,
      children,
      infants,
      travelClass,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passengers & Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-black">Adults (12+ years)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-gray-300 bg-white text-black"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  disabled={adults <= 1}
                >
                  -
                </Button>
                <span className="w-6 text-center text-black">{adults}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-gray-300 bg-white text-black"
                  onClick={() => setAdults(adults + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-black">Children (2-11 years)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-gray-300 bg-white text-black"
                  onClick={() => setChildren(Math.max(0, children - 1))}
                  disabled={children <= 0}
                >
                  -
                </Button>
                <span className="w-6 text-center text-black">{children}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-gray-300 bg-white text-black"
                  onClick={() => setChildren(children + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-black">Infants (under 2 years)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-gray-300 bg-white text-black"
                  onClick={() => setInfants(Math.max(0, infants - 1))}
                  disabled={infants <= 0}
                >
                  -
                </Button>
                <span className="w-6 text-center text-black">{infants}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-gray-300 bg-white text-black"
                  onClick={() => setInfants(Math.min(adults, infants + 1))}
                  disabled={infants >= adults}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="travel-class" className="text-black">
              Travel Class
            </Label>
            <Select value={travelClass} onValueChange={setTravelClass}>
              <SelectTrigger id="travel-class" className="w-full border-gray-300 bg-white text-black">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">Economy</SelectItem>
                <SelectItem value="premium-economy">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">First Class</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
