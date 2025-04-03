"use client"

import { Button } from "@/components/ui/button"
import { Check, Copy, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GameLobbyProps {
  roomCode: string
  isHost: boolean
  opponentConnected: boolean
  onCopyCode: () => void
  copied: boolean
}

export default function GameLobby({ roomCode, isHost, opponentConnected, onCopyCode, copied }: GameLobbyProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-full bg-slate-100 dark:bg-slate-800 p-6 rounded-lg text-center">
        <h3 className="text-lg font-semibold mb-2">Room Code</h3>
        <div className="flex items-center justify-center gap-2">
          <code className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded font-mono text-xl">{roomCode}</code>
          <Button variant="outline" size="icon" onClick={onCopyCode} className="h-10 w-10">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn("w-3 h-3 rounded-full", opponentConnected ? "bg-green-500" : "bg-amber-500 animate-pulse")}
          />
          <span>
            {opponentConnected
              ? "Opponent connected! Game will start automatically."
              : "Waiting for opponent to join..."}
          </span>
        </div>

        {!opponentConnected && (
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Share the room code with your friend to play together</span>
          </div>
        )}
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-sm">
        <h4 className="font-medium mb-2">How to play:</h4>
        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
          <li>The game creator plays as X and goes first</li>
          <li>The player who joins plays as O</li>
          <li>Take turns placing your mark on the board</li>
          <li>First player to get 3 in a row wins!</li>
        </ul>
      </div>
    </div>
  )
}

