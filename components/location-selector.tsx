"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MapPin, Check } from "lucide-react"

// Sample data - in a real app, this would come from an API
const locations = [
  { code: "JFK", name: "New York (JFK)", country: "United States" },
  { code: "LAX", name: "Los Angeles (LAX)", country: "United States" },
  { code: "LHR", name: "London Heathrow (LHR)", country: "United Kingdom" },
  { code: "CDG", name: "Paris Charles de Gaulle (CDG)", country: "France" },
  { code: "DXB", name: "Dubai International (DXB)", country: "UAE" },
  { code: "HND", name: "Tokyo Haneda (HND)", country: "Japan" },
  { code: "SYD", name: "Sydney (SYD)", country: "Australia" },
  { code: "SIN", name: "Singapore Changi (SIN)", country: "Singapore" },
  { code: "AMS", name: "Amsterdam Schiphol (AMS)", country: "Netherlands" },
  { code: "FRA", name: "Frankfurt (FRA)", country: "Germany" },
]

interface LocationSelectorProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function LocationSelector({
  id,
  value,
  onChange,
  placeholder = "Select location",
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedLocation = locations.find((loc) => loc.code === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" id={id}>
          {selectedLocation ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{selectedLocation.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search location..." />
          <CommandList>
            <CommandEmpty>No locations found.</CommandEmpty>
            <CommandGroup>
              {locations.map((location) => (
                <CommandItem
                  key={location.code}
                  value={location.code}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      {location.code === value && <Check className="mr-2 h-4 w-4" />}
                      <span className="font-medium">{location.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{location.country}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
