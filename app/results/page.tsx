"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Info, Plane, Calendar, ChevronDown, ArrowRight, AlertCircle } from "lucide-react"
import Link from "next/link"
import { format, addDays, subDays, parseISO } from "date-fns"
import FlightResultsSkeleton from "@/components/flight-results-skeleton"
import PriceDetails from "@/components/price-details"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import supabaseClient from "@/lib/supabase"

interface Airport {
  airportcode: string
  airportname: string
  city: string
  country: string
}

interface FlightResult {
  flightid: number
  flightnumber: string
  departureairportcode: string
  arrivalairportcode: string
  departuredatetime: string
  arrivaldatetime: string
  status: string
  departureAirport?: Airport
  arrivalAirport?: Airport
  economyPrice?: number
  businessPrice?: number
  duration?: string
}

interface SelectedFlightDetails {
  flightId: number
  class: "economy" | "business"
  fareType: string
  price: number
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureResults, setDepartureResults] = useState<FlightResult[]>([])
  const [returnResults, setReturnResults] = useState<FlightResult[]>([])
  const [airports, setAirports] = useState<Record<string, Airport>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<SelectedFlightDetails | null>(null)
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<SelectedFlightDetails | null>(null)
  const [activeFlightId, setActiveFlightId] = useState<number | null>(null)
  const [activeClass, setActiveClass] = useState<"economy" | "business" | null>(null)
  const [activeTab, setActiveTab] = useState<string>("departure")

  // Get search parameters
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const tripType = searchParams.get("tripType") || "one-way"
  const departDate = searchParams.get("departDate") || ""
  const returnDate = searchParams.get("returnDate") || ""
  const isRoundTrip = tripType === "round-trip"

  // Fetch airports data
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const { data, error } = await supabaseClient.from("airports").select("airportcode, airportname, city, country")

        if (error) throw new Error(error.message)

        // Convert to a lookup object for easier access
        const airportsMap: Record<string, Airport> = {}
        data?.forEach((airport) => {
          airportsMap[airport.airportcode] = airport
        })

        setAirports(airportsMap)
      } catch (err) {
        console.error("Error fetching airports:", err)
        setError("Failed to load airport information")
      }
    }

    fetchAirports()
  }, [])

  // Fetch flights data
  useEffect(() => {
    const fetchFlights = async () => {
      if (!from || !to) {
        setError("Missing departure or destination")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Fetch departure flights
        const { data: departureData, error: departureError } = await supabaseClient
          .from("flights")
          .select(`
            flightid, 
            flightnumber, 
            departureairportcode, 
            arrivalairportcode, 
            departuredatetime, 
            arrivaldatetime, 
            status
          `)
          .eq("departureairportcode", from)
          .eq("arrivalairportcode", to)

        if (departureError) throw new Error(departureError.message)

        // Fetch return flights if round trip
        let returnData = null
        if (isRoundTrip) {
          const { data, error: returnError } = await supabaseClient
            .from("flights")
            .select(`
              flightid, 
              flightnumber, 
              departureairportcode, 
              arrivalairportcode, 
              departuredatetime, 
              arrivaldatetime, 
              status
            `)
            .eq("departureairportcode", to)
            .eq("arrivalairportcode", from)

          if (returnError) throw new Error(returnError.message)
          returnData = data
        }

        // Fetch prices for all flights
        const flightIds = [
          ...(departureData?.map((f) => f.flightid) || []),
          ...(returnData?.map((f) => f.flightid) || []),
        ]

        let prices: Record<number, Record<number, number>> = {}

        if (flightIds.length > 0) {
          const { data: priceData, error: priceError } = await supabaseClient
            .from("flightprices")
            .select("flightid, classid, price")
            .in("flightid", flightIds)

          if (priceError) throw new Error(priceError.message)

          // Organize prices by flight and class
          prices =
            priceData?.reduce(
              (acc, item) => {
                if (!acc[item.flightid]) {
                  acc[item.flightid] = {}
                }
                acc[item.flightid][item.classid] = item.price
                return acc
              },
              {} as Record<number, Record<number, number>>,
            ) || {}
        }

        // Process departure flights
        const processedDepartureFlights =
          departureData?.map((flight) => {
            const departureTime = parseISO(flight.departuredatetime)
            const arrivalTime = parseISO(flight.arrivaldatetime)
            const durationMs = arrivalTime.getTime() - departureTime.getTime()
            const hours = Math.floor(durationMs / (1000 * 60 * 60))
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

            return {
              ...flight,
              departureAirport: airports[flight.departureairportcode],
              arrivalAirport: airports[flight.arrivalairportcode],
              economyPrice: prices[flight.flightid]?.[1] || 11473000, // Default price if not found
              businessPrice: prices[flight.flightid]?.[3] || 28373000, // Default price if not found
              duration: `${hours}h ${minutes} mins`,
            }
          }) || []

        // Process return flights
        const processedReturnFlights =
          returnData?.map((flight) => {
            const departureTime = parseISO(flight.departuredatetime)
            const arrivalTime = parseISO(flight.arrivaldatetime)
            const durationMs = arrivalTime.getTime() - departureTime.getTime()
            const hours = Math.floor(durationMs / (1000 * 60 * 60))
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

            return {
              ...flight,
              departureAirport: airports[flight.departureairportcode],
              arrivalAirport: airports[flight.arrivalairportcode],
              economyPrice: prices[flight.flightid]?.[1] || 11473000, // Default price if not found
              businessPrice: prices[flight.flightid]?.[3] || 28373000, // Default price if not found
              duration: `${hours}h ${minutes} mins`,
            }
          }) || []

        setDepartureResults(processedDepartureFlights)
        setReturnResults(processedReturnFlights)

        if (processedDepartureFlights.length === 0) {
          setError("No flights found for the selected route")
        }
      } catch (err) {
        console.error("Error fetching flights:", err)
        setError("Failed to load flight information")
      } finally {
        setLoading(false)
      }
    }

    if (Object.keys(airports).length > 0) {
      fetchFlights()
    }
  }, [from, to, isRoundTrip, airports, departDate, returnDate])

  // Generate dates for the date selector
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(selectedDate, i - 3)
    return {
      date,
      day: format(date, "EEE"),
      dayOfMonth: format(date, "MMM d"),
      price: Math.floor(10000000 + Math.random() * 10000000),
    }
  })

  const handlePreviousDays = () => {
    setSelectedDate(subDays(selectedDate, 7))
  }

  const handleNextDays = () => {
    setSelectedDate(addDays(selectedDate, 7))
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount)
  }

  const handleSelectClass = (flightId: number, classType: "economy" | "business") => {
    if (activeFlightId === flightId && activeClass === classType) {
      // If clicking the same flight and class, close the details
      setActiveFlightId(null)
      setActiveClass(null)
    } else {
      // Otherwise, open the details for the selected flight and class
      setActiveFlightId(flightId)
      setActiveClass(classType)
    }
  }

  const handleSelectFare = (fareType: string, price: number) => {
    if (!activeFlightId || !activeClass) return

    const flightDetails = {
      flightId: activeFlightId,
      class: activeClass,
      fareType,
      price,
    }

    // Determine if this is a departure or return flight selection
    if (activeTab === "departure" || !isRoundTrip) {
      setSelectedDepartureFlight(flightDetails)

      // If round trip, automatically switch to return tab after selecting departure
      if (isRoundTrip && !selectedReturnFlight) {
        setActiveTab("return")
      }
    } else {
      setSelectedReturnFlight(flightDetails)
    }

    // Reset active selections
    setActiveFlightId(null)
    setActiveClass(null)
  }

  const getTotalPrice = () => {
    let total = 0
    if (selectedDepartureFlight) {
      total += selectedDepartureFlight.price
    }
    if (selectedReturnFlight) {
      total += selectedReturnFlight.price
    }
    return total
  }

  const handleContinue = () => {
    if (isRoundTrip && (!selectedDepartureFlight || !selectedReturnFlight)) {
      alert("Please select both departure and return flights")
      return
    }

    if (!isRoundTrip && !selectedDepartureFlight) {
      alert("Please select a flight")
      return
    }

    // In a real app, this would navigate to the passenger details page
    console.log("Continuing with:", { selectedDepartureFlight, selectedReturnFlight })
    alert(`Selected flights with total price: ${formatCurrency(getTotalPrice())} VND`)
  }

  const renderFlightResults = (results: FlightResult[], isReturn = false) => {
    if (results.length === 0 && !loading) {
      return (
        <div className="rounded-lg bg-white p-6 text-center text-[#0f2d3c]">
          <p>No flights found for this route. Please try different dates or destinations.</p>
        </div>
      )
    }

    return (
      <section className="space-y-4">
        {results.map((flight) => {
          const isSelected = isReturn
            ? selectedReturnFlight?.flightId === flight.flightid
            : selectedDepartureFlight?.flightId === flight.flightid

          const departureTime = new Date(flight.departuredatetime)
          const arrivalTime = new Date(flight.arrivaldatetime)

          return (
            <div key={flight.flightid} className="overflow-hidden rounded-lg">
              <div className="bg-white p-4 text-[#0f2d3c]">
                <div className="grid grid-cols-12 gap-4">
                  {/* Flight numbers and info */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span>{flight.flightnumber}</span>
                      <Info size={16} className="cursor-pointer text-blue-600" />
                    </div>
                    <div className="mt-2 text-sm">{format(departureTime, "MMM d, yyyy")}</div>
                    <div className="mt-1 text-xs text-gray-500">{flight.status}</div>
                  </div>

                  {/* Flight times and duration */}
                  <div className="col-span-6">
                    <div className="grid grid-cols-3 items-center">
                      <div className="text-left">
                        <div className="text-2xl font-bold">{format(departureTime, "HH:mm")}</div>
                        <div className="text-lg font-medium">{flight.departureairportcode}</div>
                        <div className="text-xs text-gray-500">
                          {flight.departureAirport?.city || flight.departureairportcode}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="relative">
                          <div className="flex items-center justify-center">
                            <div className="text-sm">{flight.duration}</div>
                          </div>
                          <div className="relative mt-2 flex items-center">
                            <div className="h-[1px] flex-grow bg-gray-300"></div>
                            <Plane size={16} className="mx-2 rotate-90" />
                            <div className="h-[1px] flex-grow bg-gray-300"></div>
                          </div>
                          <div className="mt-2 text-center text-sm">Direct</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold">{format(arrivalTime, "HH:mm")}</div>
                        <div className="text-lg font-medium">{flight.arrivalairportcode}</div>
                        <div className="text-xs text-gray-500">
                          {flight.arrivalAirport?.city || flight.arrivalairportcode}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="col-span-4 grid grid-cols-2 gap-4">
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-colors ${
                        activeFlightId === flight.flightid && activeClass === "economy"
                          ? "bg-[#6d7276] text-white"
                          : isSelected && selectedDepartureFlight?.class === "economy"
                            ? "bg-[#6d7276]/20"
                            : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSelectClass(flight.flightid, "economy")}
                    >
                      <div className="text-center font-medium">Economy</div>
                      <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500">from VND</div>
                        <div className="text-xl font-bold">{formatCurrency(flight.economyPrice || 0)}</div>
                      </div>
                      <div
                        className={`mt-2 h-1 w-full rounded ${
                          activeFlightId === flight.flightid && activeClass === "economy" ? "bg-white" : "bg-[#6d7276]"
                        }`}
                      ></div>
                    </div>

                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-colors ${
                        activeFlightId === flight.flightid && activeClass === "business"
                          ? "bg-[#9f554c] text-white"
                          : isSelected && selectedDepartureFlight?.class === "business"
                            ? "bg-[#9f554c]/20"
                            : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSelectClass(flight.flightid, "business")}
                    >
                      <div className="text-center font-medium">Business</div>
                      <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500">from VND</div>
                        <div className="text-xl font-bold">{formatCurrency(flight.businessPrice || 0)}</div>
                      </div>
                      <div
                        className={`mt-2 h-1 w-full rounded ${
                          activeFlightId === flight.flightid && activeClass === "business" ? "bg-white" : "bg-[#9f554c]"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price details section that slides down */}
              {activeFlightId === flight.flightid && activeClass && (
                <PriceDetails
                  flightId={flight.flightid.toString()}
                  selectedClass={activeClass}
                  onClose={() => {
                    setActiveFlightId(null)
                    setActiveClass(null)
                  }}
                  onSelect={handleSelectFare}
                />
              )}
            </div>
          )
        })}
      </section>
    )
  }

  // Format for display
  const fromDisplay = airports[from]?.city || from
  const toDisplay = airports[to]?.city || to

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {isRoundTrip ? "Round trip" : "One way"}: {fromDisplay} - {toDisplay}
            </h1>
            <Link href="#" className="flex items-center gap-1 text-sm">
              <span className="text-yellow-400">
                <Calendar className="h-5 w-5" />
              </span>
              See a month fare
            </Link>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 text-white border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="mb-6 overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between bg-gray-100 px-4 py-3 text-[#0f2d3c]">
            <button onClick={handlePreviousDays} className="flex items-center gap-1 text-sm font-medium">
              <ChevronLeft size={16} />
              Previous 7 days
            </button>
            <button onClick={handleNextDays} className="flex items-center gap-1 text-sm font-medium">
              Next 7 days
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {dates.map((date, index) => {
              const isSelected = index === 3
              return (
                <div
                  key={date.dayOfMonth}
                  className={`cursor-pointer p-4 text-center ${
                    isSelected ? "bg-[#3a2d4c] text-white" : "bg-[#f8f0ff] text-[#0f2d3c] hover:bg-[#e8e0ef]"
                  }`}
                >
                  <div className="font-medium">
                    {date.day}, {date.dayOfMonth}
                  </div>
                  <div className="mt-1 text-sm">VND {formatCurrency(date.price)}</div>
                </div>
              )
            })}
          </div>
        </section>

        {loading ? (
          <FlightResultsSkeleton />
        ) : isRoundTrip ? (
          <Tabs defaultValue="departure" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-[#0f2d3c]/50">
              <TabsTrigger value="departure" className={`${selectedDepartureFlight ? "text-green-400" : ""}`}>
                Departure Flight {selectedDepartureFlight && "✓"}
              </TabsTrigger>
              <TabsTrigger value="return" className={`${selectedReturnFlight ? "text-green-400" : ""}`}>
                Return Flight {selectedReturnFlight && "✓"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="departure">
              <div className="mb-4 flex items-center gap-2 text-lg">
                <span>{fromDisplay}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{toDisplay}</span>
              </div>
              {renderFlightResults(departureResults)}
            </TabsContent>
            <TabsContent value="return">
              <div className="mb-4 flex items-center gap-2 text-lg">
                <span>{toDisplay}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{fromDisplay}</span>
              </div>
              {renderFlightResults(returnResults, true)}
            </TabsContent>
          </Tabs>
        ) : (
          renderFlightResults(departureResults)
        )}
      </div>

      {/* Sticky bar at the bottom */}
      {(selectedDepartureFlight || selectedReturnFlight) && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex items-center text-[#0f2d3c]">
                <span className="font-medium">Details</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <div className="text-xl font-bold text-[#0f2d3c]">
                Total: VND {formatCurrency(getTotalPrice())}
                {isRoundTrip && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedDepartureFlight ? formatCurrency(selectedDepartureFlight.price) : "0"} +{" "}
                    {selectedReturnFlight ? formatCurrency(selectedReturnFlight.price) : "0"})
                  </span>
                )}
              </div>
            </div>
            <Button
              className="bg-[#0f2d3c] hover:bg-[#0f2d3c]/90"
              onClick={handleContinue}
              disabled={isRoundTrip && (!selectedDepartureFlight || !selectedReturnFlight)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
