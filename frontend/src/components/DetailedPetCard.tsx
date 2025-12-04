import { DetailedPet } from "@/types/customerDetail"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface DetailedPetCardProps {
  pet: DetailedPet
}

export function DetailedPetCard({ pet }: DetailedPetCardProps) {
  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          {/* Pet Image */}
          <div className="flex-shrink-0">
            {pet.imageUrl ? (
              <img
                src={pet.imageUrl}
                alt={pet.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No photo</span>
              </div>
            )}
          </div>

          {/* Pet Details */}
          <div className="flex-1 space-y-2">
            {/* Name, Breed, Groomer */}
            <div className="flex items-baseline gap-4">
              <h3 className="text-2xl font-bold">{pet.name}</h3>
              <span className="text-lg">{pet.breed}</span>
              <span className="text-lg">{pet.groomerName}</span>
            </div>

            {/* Vaccination Status and Codes */}
            <div className="flex items-center gap-2">
              <Badge
                variant={pet.vaccinationStatus === "active" ? "default" : "secondary"}
                className="text-sm"
              >
                Vaccine {pet.vaccinationStatus === "active" ? "Active" : "Inactive"}
              </Badge>
              {pet.vaccinations.map((vax) => (
                <Badge key={vax.code} variant="outline" className="text-sm font-mono">
                  {vax.code}
                </Badge>
              ))}
            </div>

            {/* Booking Dates */}
            <div className="text-base space-y-1">
              {pet.nextBooking && (
                <div>
                  <span className="font-medium">Next Booking:</span>{" "}
                  {format(new Date(pet.nextBooking), "MM/dd/yy")}
                </div>
              )}
              {pet.lastBooked && (
                <div>
                  <span className="font-medium">Last booked:</span>{" "}
                  {format(new Date(pet.lastBooked), "MM/dd/yy")}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
