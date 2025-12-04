import { useState } from "react"
import { Note } from "@/types/customerDetail"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

interface NotesSectionProps {
  title: string
  notes: Note[]
  onAddNote?: (content: string) => void
}

export function NotesSection({ title, notes, onAddNote }: NotesSectionProps) {
  const [newNote, setNewNote] = useState("")

  const handleAddNote = () => {
    if (newNote.trim() && onAddNote) {
      onAddNote(newNote)
      setNewNote("")
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Input */}
        <div className="space-y-2">
          <textarea
            placeholder="Add note"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full min-h-[80px] p-3 border-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {newNote.trim() && (
            <Button onClick={handleAddNote} size="sm">
              Save Note
            </Button>
          )}
        </div>

        {/* Existing Notes */}
        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border-l-4 border-gray-300 pl-3 space-y-1">
                <p className="text-base">{note.content}</p>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{format(new Date(note.date), "MM/dd/yy")}</span>
                  <span>{note.authorName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
