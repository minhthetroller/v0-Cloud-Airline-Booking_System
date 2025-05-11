"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronRight, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import supabaseClient from "@/lib/supabase"
import SeatMap from "@/components/seat-map"
import LoginOrGuestDialog from "@/components/login-or-guest-dialog"

interface SelectedFlightDetails {
  flightId: number
  class: string
  fareType: string
  price: number
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  departureAirport?: string
  arrivalAirport?: string
  duration?: string
}

interface AirplaneType {
  airplanetypeid: number
  modelname: string
  manufacturer: string
  totalseats: number
}

interface Seat {
  seatid: number
  airplanetypeid: number
  seatnumber: string
  classid: number
  seattype: string
  isoccupied?: boolean
}

export default function SeatSelectionPage() {
  const router = useRouter()
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [airplaneType, setAirplaneType] = useState<AirplaneType | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [activeFlightType, setActiveFlightType] = useState<"departure" | "return">("departure")
  const [selectedDepartureSeat, setSelectedDepartureSeat] = useState<Seat | null>(null)
  const [selectedReturnSeat, setSelectedReturnSeat] = useState<Seat | null>(null)
  const [userClassId, setUserClassId] = useState<number>(1) // Default to Economy Saver
  const [loginOrGuestDialogOpen, setLoginOrGuestDialogOpen] = useState(false)
  const [occupiedSeats, setOccupiedSeats] = useState<Set<string>>(new Set())
  const [reservationIds, setReservationIds] = useState({ departure: null, return: null })
  const [fareType, setFareType] = useState<string>("Economy Saver")

  // Load flight details from session storage
  useEffect(() => {
    const departureFlight = sessionStorage.getItem("selectedDepartureFlight")
    const returnFlight = sessionStorage.getItem("selectedReturnFlight")

    if (!departureFlight) {
      router.push("/results")
      return
    }

    const parsedDepartureFlight = JSON.parse(departureFlight)
    setSelectedDepartureFlight(parsedDepartureFlight)
    setFareType(parsedDepartureFlight.fareType)

    if (returnFlight) {
      setSelectedReturnFlight(JSON.parse(returnFlight))
      setIsRoundTrip(true)
    }

    // Set initial active flight
    setActiveFlightType("departure")

    // Set user class ID based on fare type
    const initialFareType = parsedDepartureFlight.fareType
    if (initialFareType === "Economy Saver") setUserClassId(1)
    else if (initialFareType === "Economy Flex") setUserClassId(2)
    else if (initialFareType === "Premium Economy") setUserClassId(3)
    else if (initialFareType === "Business") setUserClassId(4)
    else if (initialFareType === "First Class") setUserClassId(5)
  }, [router])

  // Fetch airplane type and seats when flight details are loaded
  useEffect(() => {
    const fetchAirplaneAndSeats = async () => {
      if (!selectedDepartureFlight) return

      setInitialLoading(true)
      setError(null)

      try {
        // Always use a default airplane type ID since it's not available in the flight details
        const airplaneTypeId = 1 // Default airplane type ID

        // Fetch airplane type
        const { data: airplaneData, error: airplaneError } = await supabaseClient
          .from("airplanetypes")
          .select("*")
          .eq("airplanetypeid", airplaneTypeId)
          .single()

        if (airplaneError) throw new Error(airplaneError.message)
        setAirplaneType(airplaneData)

        // Fetch seats for this airplane type
        const { data: seatsData, error: seatsError } = await supabaseClient
          .from("seats")
          .select("*")
          .eq("airplanetypeid", airplaneTypeId)

        if (seatsError) throw new Error(seatsError.message)

        // Simulate some occupied seats (in a real app, this would come from the database)
        const occupied = new Set([
          "3A",
          "3B",
          "3C",
          "4D",
          "4E",
          "4F",
          "5B",
          "5E",
          "6C",
          "6D",
          "7A",
          "7F",
          "8B",
          "8E",
          "9C",
          "9D",
          "10A",
          "10F",
        ])

        setOccupiedSeats(occupied)

        // Process seats data
        const processedSeats = seatsData.map((seat: Seat) => ({
          ...seat,
          isoccupied: occupied.has(seat.seatnumber),
        }))

        setSeats(processedSeats)

        // Set selected seat if already chosen
        if (activeFlightType === "departure" && selectedDepartureSeat) {
          setSelectedSeat(selectedDepartureSeat)
        } else if (activeFlightType === "return" && selectedReturnSeat) {
          setSelectedSeat(selectedReturnSeat)
        } else {
          setSelectedSeat(null)
        }
      } catch (err: any) {
        console.error("Error fetching airplane and seats:", err)
        setError(err.message || "Failed to load seat information")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchAirplaneAndSeats()
  }, [selectedDepartureFlight]) // Only run on initial load, not on seat selection

  const handleSeatSelect = async (seat: Seat) => {
    if (seat.isoccupied) return // Cannot select occupied seats

    try {
      // Determine which flight we're selecting a seat for
      const flightId =
        activeFlightType === "departure" ? selectedDepartureFlight?.flightId : selectedReturnFlight?.flightId

      if (!flightId) {
        throw new Error("Flight ID not found")
      }

      // Check if we need to release a previously selected seat
      const previousSeat = activeFlightType === "departure" ? selectedDepartureSeat : selectedReturnSeat
      const previousReservationId = activeFlightType === "departure" ? reservationIds.departure : reservationIds.return

      if (previousSeat) {
        // Update the availability count for the previous seat's class
        try {
          // In a real implementation, we would update the flightprices table to increment the availability count
          console.log(`Released seat ${previousSeat.seatnumber} for flight ${flightId}`)

          // Update the local state to mark the previous seat as available
          const updatedSeats = seats.map((s) => {
            if (s.seatid === previousSeat.seatid) {
              return { ...s, isoccupied: false }
            }
            return s
          })
          setSeats(updatedSeats)

          // Remove from occupied seats
          const newOccupied = new Set(occupiedSeats)
          newOccupied.delete(previousSeat.seatnumber)
          setOccupiedSeats(newOccupied)
        } catch (err) {
          console.error("Error releasing previous seat:", err)
        }
      }

      // Update the availability count for the new seat's class
      try {
        // In a real implementation, we would update the flightprices table to decrement the availability count
        console.log(`Reserved seat ${seat.seatnumber} for flight ${flightId}`)

        // Update the local state to mark the new seat as occupied
        const updatedSeats = seats.map((s) => {
          if (s.seatid === seat.seatid) {
            return { ...s, isoccupied: false } // Not marking as occupied in the map, just for the user's selection
          }
          return s
        })
        setSeats(updatedSeats)

        // Add to occupied seats (for tracking purposes)
        const newOccupied = new Set(occupiedSeats)
        newOccupied.add(seat.seatnumber)
        setOccupiedSeats(newOccupied)
      } catch (err) {
        console.error("Error reserving new seat:", err)
        throw new Error("Failed to reserve seat")
      }

      // Update the selected seat
      setSelectedSeat(seat)

      if (activeFlightType === "departure") {
        setSelectedDepartureSeat(seat)
      } else {
        setSelectedReturnSeat(seat)
      }
    } catch (err: any) {
      console.error("Error reserving seat:", err)
      alert("Failed to reserve seat. Please try again.")
    }
  }

  const handleUpgradeClass = (newClassId: number) => {
    // Update the user's class ID
    setUserClassId(newClassId)

    // Update the fare type based on the new class ID
    let newFareType = "Economy Saver"
    if (newClassId === 1) newFareType = "Economy Saver"
    else if (newClassId === 2) newFareType = "Economy Flex"
    else if (newClassId === 3) newFareType = "Premium Economy"
    else if (newClassId === 4) newFareType = "Business"
    else if (newClassId === 5) newFareType = "First Class"

    setFareType(newFareType)

    // Update the flight details with the new fare type
    if (activeFlightType === "departure" && selectedDepartureFlight) {
      const updatedFlight = { ...selectedDepartureFlight, fareType: newFareType }
      setSelectedDepartureFlight(updatedFlight)
      sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(updatedFlight))
    } else if (activeFlightType === "return" && selectedReturnFlight) {
      const updatedFlight = { ...selectedReturnFlight, fareType: newFareType }
      setSelectedReturnFlight(updatedFlight)
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(updatedFlight))
    }
  }

  const handleDowngradeClass = (newClassId: number) => {
    // Update the user's class ID
    setUserClassId(newClassId)

    // Update the fare type based on the new class ID
    let newFareType = "Economy Saver"
    if (newClassId === 1) newFareType = "Economy Saver"
    else if (newClassId === 2) newFareType = "Economy Flex"
    else if (newClassId === 3) newFareType = "Premium Economy"
    else if (newClassId === 4) newFareType = "Business"
    else if (newClassId === 5) newFareType = "First Class"

    setFareType(newFareType)

    // Update the flight details with the new fare type
    if (activeFlightType === "departure" && selectedDepartureFlight) {
      const updatedFlight = { ...selectedDepartureFlight, fareType: newFareType }
      setSelectedDepartureFlight(updatedFlight)
      sessionStorage.setItem("selectedDepartureFlight", JSON.stringify(updatedFlight))
    } else if (activeFlightType === "return" && selectedReturnFlight) {
      const updatedFlight = { ...selectedReturnFlight, fareType: newFareType }
      setSelectedReturnFlight(updatedFlight)
      sessionStorage.setItem("selectedReturnFlight", JSON.stringify(updatedFlight))
    }
  }

  const handleContinue = () => {
    if (isRoundTrip && activeFlightType === "departure") {
      if (!selectedDepartureSeat) {
        alert("Please select a seat for your departure flight")
        return
      }
      // Switch to return flight seat selection
      setActiveFlightType("return")
      return
    }

    // Check if seats are selected
    if (
      (activeFlightType === "departure" && !selectedDepartureSeat) ||
      (activeFlightType === "return" && !selectedReturnSeat)
    ) {
      alert("Please select a seat for your flight")
      return
    }

    // Store selected seats in session storage
    if (selectedDepartureSeat) {
      sessionStorage.setItem("selectedDepartureSeat", JSON.stringify(selectedDepartureSeat))
    }

    if (selectedReturnSeat) {
      sessionStorage.setItem("selectedReturnSeat", JSON.stringify(selectedReturnSeat))
    }

    // Store reservation IDs
    sessionStorage.setItem("seatReservationIds", JSON.stringify(reservationIds))

    // Open login or guest dialog
    setLoginOrGuestDialogOpen(true)
  }

  const handleSwitchFlight = () => {
    setActiveFlightType(activeFlightType === "departure" ? "return" : "departure")

    // Update the selected seat based on the active flight type
    if (activeFlightType === "departure") {
      setSelectedSeat(selectedReturnSeat)
    } else {
      setSelectedSeat(selectedDepartureSeat)
    }
  }

  const handleLoginSuccess = () => {
    // Close the dialog and redirect to confirmation page
    setLoginOrGuestDialogOpen(false)
    router.push("/confirmation")
  }

  const handleGuestContinue = () => {
    // Close the dialog and redirect to guest information page
    setLoginOrGuestDialogOpen(false)
    router.push("/guest-information")
  }

  const handleCancelBooking = async () => {
    // Release all seat reservations
    try {
      // In a real implementation, we would update the flightprices table to increment the availability count
      console.log("Released all seat reservations")

      // Clear session storage and redirect to home
      sessionStorage.removeItem("selectedDepartureSeat")
      sessionStorage.removeItem("selectedReturnSeat")
      sessionStorage.removeItem("seatReservationIds")
      router.push("/")
    } catch (err) {
      console.error("Error releasing seat reservations:", err)
    }
  }

  // Clean up reservations when component unmounts
  useEffect(() => {
    return () => {
      // Release seat reservations if navigating away without completing booking
      const cleanup = async () => {
        try {
          // In a real implementation, we would update the flightprices table to increment the availability count
          console.log("Released all seat reservations during cleanup")
        } catch (err) {
          console.error("Error releasing seat reservations during cleanup:", err)
        }
      }

      cleanup()
    }
  }, [reservationIds])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  // Get active flight
  const activeFlight = activeFlightType === "departure" ? selectedDepartureFlight : selectedReturnFlight

  if (initialLoading && !activeFlight) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/results")} className="mt-4">
          Return to Flight Selection
        </Button>
      </div>
    )
  }

  if (!activeFlight) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No flight selected. Please select a flight first.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/results")} className="mt-4">
          Return to Flight Selection
        </Button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Seat Selection</h1>
            {isRoundTrip && (
              <Button variant="outline" onClick={handleSwitchFlight} className="border-white text-white">
                Switch to {activeFlightType === "departure" ? "Return" : "Departure"} Flight
              </Button>
            )}
          </div>
        </header>

        {/* Flight Info */}
        <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">
                {activeFlightType === "departure" ? "Departure" : "Return"} Flight: {activeFlight.flightNumber}
              </h2>
              <p>
                {activeFlight.departureAirport} → {activeFlight.arrivalAirport}
              </p>
              <p>{activeFlight.departureTime && format(new Date(activeFlight.departureTime), "MMM d, yyyy HH:mm")}</p>
              <p>Class: {fareType}</p>
            </div>
            {airplaneType && (
              <div className="mt-4 md:mt-0">
                <h3 className="font-medium">Aircraft Information</h3>
                <p>Model: {airplaneType.modelname}</p>
                <p>Manufacturer: {airplaneType.manufacturer}</p>
                <p>Total Seats: {airplaneType.totalseats}</p>
              </div>
            )}
          </div>
        </section>

        {/* Seat Map */}
        <section className="mb-6">
          <div className="bg-white rounded-lg p-4 text-[#0f2d3c]">
            <h2 className="text-xl font-bold mb-4">Seat Map</h2>

            {initialLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0f2d3c]"></div>
              </div>
            ) : seats.length > 0 ? (
              <SeatMap
                seats={seats}
                selectedSeat={selectedSeat}
                onSelectSeat={handleSeatSelect}
                userClassId={userClassId}
                onUpgradeClass={handleUpgradeClass}
                onDowngradeClass={handleDowngradeClass}
              />
            ) : (
              <div className="text-center py-8">
                <p>No seat map available for this flight. Please contact customer service.</p>
              </div>
            )}
          </div>
        </section>

        {/* Selected Seat Info */}
        {selectedSeat && (
          <section className="mb-6 bg-[#1a3a4a] rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Selected Seat</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Seat Number</p>
                <p className="text-2xl">{selectedSeat.seatnumber}</p>
              </div>
              <div>
                <p className="font-medium">Seat Type</p>
                <p>{selectedSeat.seattype}</p>
              </div>
              <div>
                <p className="font-medium">Class</p>
                <p>{fareType}</p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-xl font-bold text-[#0f2d3c]">
            {activeFlightType === "departure"
              ? selectedDepartureSeat
                ? `Selected Seat: ${selectedDepartureSeat.seatnumber}`
                : "No seat selected"
              : selectedReturnSeat
                ? `Selected Seat: ${selectedReturnSeat.seatnumber}`
                : "No seat selected"}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-[#0f2d3c] text-[#0f2d3c]" onClick={handleCancelBooking}>
              Cancel
            </Button>
            <Button
              className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90"
              onClick={handleContinue}
              disabled={
                (activeFlightType === "departure" && !selectedDepartureSeat) ||
                (activeFlightType === "return" && !selectedReturnSeat)
              }
            >
              {isRoundTrip && activeFlightType === "departure" ? "Next Flight" : "Continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Login or Guest Dialog */}
      <LoginOrGuestDialog
        open={loginOrGuestDialogOpen}
        onOpenChange={setLoginOrGuestDialogOpen}
        onLoginSuccess={handleLoginSuccess}
        onGuestContinue={handleGuestContinue}
      />
    </main>
  )
}
