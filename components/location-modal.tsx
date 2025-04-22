"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, MapPin } from "lucide-react"

// Sample data - in a real app, this would come from an API
const locations = [
  { code: "JFK", name: "New York", airport: "John F. Kennedy International Airport", country: "United States" },
  { code: "LAX", name: "Los Angeles", airport: "Los Angeles International Airport", country: "United States" },
  { code: "LHR", name: "London", airport: "Heathrow Airport", country: "United Kingdom" },
  { code: "CDG", name: "Paris", airport: "Charles de Gaulle Airport", country: "France" },
  { code: "DXB", name: "Dubai", airport: "Dubai International Airport", country: "UAE" },
  { code: "HND", name: "Tokyo", airport: "Haneda Airport", country: "Japan" },
  { code: "SYD", name: "Sydney", airport: "Sydney Airport", country: "Australia" },
  { code: "SIN", name: "Singapore", airport: "Changi Airport", country: "Singapore" },
  { code: "AMS", name: "Amsterdam", airport: "Schiphol Airport", country: "Netherlands" },
  { code: "FRA", name: "Frankfurt", airport: "Frankfurt Airport", country: "Germany" },
  { code: "TPE", name: "Taipei", airport: "Taiwan Taoyuan International Airport", country: "Taiwan" },
  { code: "HKG", name: "Hong Kong", airport: "Hong Kong International Airport", country: "Hong Kong" },
  { code: "ICN", name: "Seoul", airport: "Incheon International Airport", country: "South Korea" },
  { code: "BKK", name: "Bangkok", airport: "Suvarnabhumi Airport", country: "Thailand" },
  { code: "KUL", name: "Kuala Lumpur", airport: "Kuala Lumpur International Airport", country: "Malaysia" },
]

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (code: string, name: string) => void
  title: string
}

export default function LocationModal({ isOpen, onClose, onSelect, title }: LocationModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredLocations, setFilteredLocations] = useState(locations)

  useEffect(() => {
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase()
      const filtered = locations.filter(
        (location) =>
          location.name.toLowerCase().includes(lowercaseQuery) ||
          location.code.toLowerCase().includes(lowercaseQuery) ||
          location.airport.toLowerCase().includes(lowercaseQuery) ||
          location.country.toLowerCase().includes(lowercaseQuery),
      )
      setFilteredLocations(filtered)
    } else {
      setFilteredLocations(locations)
    }
  }, [searchQuery])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search city or airport"
            className="pl-9 text-black"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {filteredLocations.map((location) => (
              <button
                key={location.code}
                className="flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-gray-100"
                onClick={() => onSelect(location.code, `${location.name} (${location.code})`)}
              >
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0f2d3c]" />
                <div>
                  <div className="font-medium text-black">
                    {location.name} ({location.code})
                  </div>
                  <div className="text-sm text-gray-500">{location.airport}</div>
                  <div className="text-xs text-gray-400">{location.country}</div>
                </div>
              </button>
            ))}
            {filteredLocations.length === 0 && <div className="py-6 text-center text-gray-500">No locations found</div>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
