"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Volume2, VolumeX, RotateCcw, Trophy, Users, Cpu, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import GameLobby from "@/components/game-lobby"
import dynamic from "next/dynamic"

// Dynamically import the confetti component with no SSR
const ReactConfetti = dynamic(() => import("react-confetti"), {
  ssr: false,
})

type Player = "X" | "O" | null

interface GameHistory { 
  squares: Player[]
  currentPlayer: Player
}

// Simulated online game state
interface SimulatedGame {
  id: string
  squares: Player[]
  isXNext: boolean
  playerX: string
  playerO: string | null
  winner: Player | "draw" | null
}

export default function TicTacToe() {
  const [squares, setSquares] = useState<Player[]>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState<boolean>(true)
  const [winner, setWinner] = useState<Player | "draw" | null>(null)
  const [history, setHistory] = useState<GameHistory[]>([])
  const [currentMove, setCurrentMove] = useState<number>(0)
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true)
  const [gameMode, setGameMode] = useState<"local" | "computer" | "online">("computer")
  const [roomCode, setRoomCode] = useState<string>("")
  const [joinRoomCode, setJoinRoomCode] = useState<string>("")
  const [isHost, setIsHost] = useState<boolean>(false)
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O">("X")
  const [opponentConnected, setOpponentConnected] = useState<boolean>(false)
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true)
  const [showLobby, setShowLobby] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [simulatedGames, setSimulatedGames] = useState<Record<string, SimulatedGame>>({})
  const [useSimulatedMode, setUseSimulatedMode] = useState<boolean>(true)
  const { toast } = useToast()
  const [showConfetti, setShowConfetti] = useState<boolean>(false)
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  })

  const musicRef = useRef<HTMLAudioElement | null>(null)
  const clickSoundRef = useRef<HTMLAudioElement | null>(null)
  const winSoundRef = useRef<HTMLAudioElement | null>(null)
  const drawSoundRef = useRef<HTMLAudioElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const simulatedOpponentTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio elements
  useEffect(() => {
    // Create audio elements
    musicRef.current = new Audio()
    clickSoundRef.current = new Audio()
    winSoundRef.current = new Audio()
    drawSoundRef.current = new Audio()

    // Set properties and add error handling
    if (musicRef.current) {
      musicRef.current.src = "/game_music.mp3"
      musicRef.current.loop = true
      musicRef.current.volume = 0.3
      musicRef.current.addEventListener("error", () => {
        console.log("Music failed to load, disabling music")
        setIsMusicPlaying(false)
      })
    }

    if (clickSoundRef.current) {
      clickSoundRef.current.src = "/click.mp3"
      clickSoundRef.current.volume = 0.5
      clickSoundRef.current.addEventListener("error", () => {
        console.log("Click sound failed to load")
      })
    }

    if (winSoundRef.current) {
      winSoundRef.current.src = "/win.wav"
      winSoundRef.current.volume = 0.5
      winSoundRef.current.addEventListener("error", () => {
        console.log("Win sound failed to load")
      })
    }

    if (drawSoundRef.current) {
      drawSoundRef.current.src = "/draw.wav"
      drawSoundRef.current.volume = 0.5
      drawSoundRef.current.addEventListener("error", () => {
        console.log("Draw sound failed to load")
      })
    }

    // Preload audio files
    const preloadAudio = async () => {
      try {
        if (musicRef.current) await musicRef.current.load()
        if (clickSoundRef.current) await clickSoundRef.current.load()
        if (winSoundRef.current) await winSoundRef.current.load()
        if (drawSoundRef.current) await drawSoundRef.current.load()
      } catch (e) {
        console.error("Failed to preload audio:", e)
      }
    }

    preloadAudio()

    return () => {
      if (musicRef.current) {
        musicRef.current.pause()
        musicRef.current = null
      }
      clickSoundRef.current = null
      winSoundRef.current = null
      drawSoundRef.current = null

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      // Clear simulated opponent timer
      if (simulatedOpponentTimerRef.current) {
        clearTimeout(simulatedOpponentTimerRef.current)
      }
    }
  }, [])

  // Toggle background music
  useEffect(() => {
    if (musicRef.current) {
      if (isMusicPlaying) {
        const playPromise = musicRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.error("Audio play failed:", e)
            setIsMusicPlaying(false)
          })
        }
      } else {
        musicRef.current.pause()
      }
    }
  }, [isMusicPlaying])

  // Computer move
  useEffect(() => {
    if (gameMode === "computer" && !isXNext && !winner) {
      const timer = setTimeout(() => {
        makeComputerMove()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isXNext, winner, gameMode])

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Calculate winner
  useEffect(() => {
    const calculatedWinner = calculateWinner(squares)
    setWinner(calculatedWinner)

    if (calculatedWinner) {
      if (calculatedWinner === "draw") {
        if (isSoundEnabled && drawSoundRef.current) {
          try {
            const playPromise = drawSoundRef.current.play()
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                console.error("Draw sound play failed:", e)
              })
            }
          } catch (e) {
            console.error("Error playing draw sound:", e)
          }
        }
        toast({
          title: "It's a draw!",
          description: "No one wins this round.",
        })
        setShowConfetti(false)
      } else {
        if (isSoundEnabled && winSoundRef.current) {
          try {
            const playPromise = winSoundRef.current.play()
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                console.error("Win sound play failed:", e)
              })
            }
          } catch (e) {
            console.error("Error playing win sound:", e)
          }
        }
        toast({
          title: `Player ${calculatedWinner} wins!`,
          description: "Congratulations on your victory!",
        })

        // Show confetti celebration for winner
        setShowConfetti(true)

        // Hide confetti after 6 seconds
        setTimeout(() => {
          setShowConfetti(false)
        }, 6000)
      }

      // Update simulated game state if in online mode
      if (gameMode === "online" && useSimulatedMode && roomCode && simulatedGames[roomCode]) {
        updateSimulatedGame(roomCode, {
          ...simulatedGames[roomCode],
          winner: calculatedWinner,
        })
      }
    }
  }, [squares, isSoundEnabled, toast, gameMode, roomCode, simulatedGames, useSimulatedMode])

  // Simulated online opponent
  useEffect(() => {
    if (
      gameMode === "online" &&
      useSimulatedMode &&
      roomCode &&
      simulatedGames[roomCode] &&
      !isMyTurn &&
      !winner &&
      opponentConnected
    ) {
      // Clear any existing timer
      if (simulatedOpponentTimerRef.current) {
        clearTimeout(simulatedOpponentTimerRef.current)
      }

      // Simulate opponent thinking and making a move
      simulatedOpponentTimerRef.current = setTimeout(
        () => {
          const game = simulatedGames[roomCode]
          if (!game || game.winner) return

          // Ensure game.squares is an array before proceeding
          if (!Array.isArray(game.squares)) {
            console.error("game.squares is not an array:", game.squares)
            return
          }

          // Find available moves
          const availableMoves = game.squares.map((square, i) => (square === null ? i : -1)).filter((i) => i !== -1)

          if (availableMoves.length > 0) {
            // Choose a random move
            const moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)]

            // Make the move
            const newSquares = [...game.squares]
            newSquares[moveIndex] = game.isXNext ? "X" : "O"

            // Update game state
            updateSimulatedGame(roomCode, {
              ...game,
              squares: newSquares,
              isXNext: !game.isXNext,
            })

            // Update local state
            setSquares(newSquares)
            setIsXNext(!game.isXNext)
            setIsMyTurn(true)

            // Update history
            const newHistory = history.slice(0, currentMove + 1)
            newHistory.push({
              squares: newSquares,
              currentPlayer: game.isXNext ? "X" : "O",
            })
            setHistory(newHistory)
            setCurrentMove(newHistory.length - 1)
          }
        },
        1000 + Math.random() * 1000,
      ) // Random delay between 1-2 seconds

      return () => {
        if (simulatedOpponentTimerRef.current) {
          clearTimeout(simulatedOpponentTimerRef.current)
        }
      }
    }
  }, [gameMode, useSimulatedMode, roomCode, simulatedGames, isMyTurn, winner, opponentConnected, history, currentMove])

  // WebSocket connection for online play (with fallback to simulated mode)
  useEffect(() => {
    if (gameMode === "online" && roomCode && !useSimulatedMode) {
      try {
        // Try to connect to WebSocket server
        const ws = new WebSocket(`wss://free-tictactoe-server.glitch.me/${roomCode}`)
        wsRef.current = ws

        ws.onopen = () => {
          console.log("Connected to game server")

          // Send join message
          ws.send(
            JSON.stringify({
              type: "join",
              room: roomCode,
              isHost,
            }),
          )
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            switch (data.type) {
              case "player_joined":
                setOpponentConnected(true)
                toast({
                  title: "Opponent connected!",
                  description: "The game can now begin.",
                })
                break

              case "player_left":
                setOpponentConnected(false)
                toast({
                  title: "Opponent disconnected",
                  description: "Waiting for them to reconnect...",
                })
                break

              case "game_start":
                setPlayerSymbol(data.symbol)
                setIsMyTurn(data.symbol === "X")
                resetGame(false)
                setShowLobby(false)
                break

              case "move":
                if (data.squares) {
                  setSquares(data.squares)
                  setIsXNext(data.isXNext)
                  setIsMyTurn(data.isXNext ? playerSymbol === "X" : playerSymbol === "O")

                  // Update history
                  const newHistory = [
                    ...history,
                    {
                      squares: data.squares,
                      currentPlayer: data.isXNext ? "O" : "X",
                    },
                  ]
                  setHistory(newHistory)
                  setCurrentMove(newHistory.length - 1)
                }
                break

              case "game_over":
                // Already handled by the winner effect
                break

              case "error":
                toast({
                  title: "Error",
                  description: data.message,
                  variant: "destructive",
                })
                break
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e)
          }
        }

        ws.onerror = (error) => {
          console.error("WebSocket error:", error)

          // Fall back to simulated mode
          setUseSimulatedMode(true)

          toast({
            title: "Using simulated mode",
            description: "WebSocket connection failed. Using simulated online mode instead.",
          })

          // Initialize simulated game
          if (isHost) {
            initializeSimulatedGame(roomCode)
          } else {
            joinSimulatedGame(roomCode)
          }
        }

        ws.onclose = () => {
          console.log("Disconnected from game server")

          // Fall back to simulated mode if still in online mode
          if (gameMode === "online" && !useSimulatedMode) {
            setUseSimulatedMode(true)

            toast({
              title: "Using simulated mode",
              description: "WebSocket connection closed. Using simulated online mode instead.",
            })

            // Initialize simulated game
            if (isHost) {
              initializeSimulatedGame(roomCode)
            } else {
              joinSimulatedGame(roomCode)
            }
          }
        }

        return () => {
          ws.close()
          wsRef.current = null
        }
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error)

        // Fall back to simulated mode
        setUseSimulatedMode(true)

        toast({
          title: "Using simulated mode",
          description: "WebSocket connection failed. Using simulated online mode instead.",
        })

        // Initialize simulated game
        if (isHost) {
          initializeSimulatedGame(roomCode)
        } else {
          joinSimulatedGame(roomCode)
        }
      }
    } else if (gameMode === "online" && roomCode && useSimulatedMode) {
      // Initialize or join simulated game
      if (isHost) {
        initializeSimulatedGame(roomCode)
      } else {
        joinSimulatedGame(roomCode)
      }
    }
  }, [roomCode, gameMode, isHost, useSimulatedMode, toast, history, playerSymbol])

  // Simulated game state sync
  useEffect(() => {
    if (gameMode === "online" && useSimulatedMode && roomCode && simulatedGames[roomCode]) {
      const game = simulatedGames[roomCode]

      // Ensure game.squares is an array before proceeding
      if (!Array.isArray(game.squares)) {
        console.error("game.squares is not an array:", game.squares)
        return
      }

      // Sync game state if it's not our turn
      if ((playerSymbol === "X" && !game.isXNext) || (playerSymbol === "O" && game.isXNext)) {
        setIsMyTurn(false)
      } else {
        setIsMyTurn(true)
      }

      // Sync board state if it's different
      if (JSON.stringify(squares) !== JSON.stringify(game.squares)) {
        setSquares([...game.squares])
      }

      // Sync winner state
      if (game.winner && game.winner !== winner) {
        setWinner(game.winner)
      }
    }
  }, [gameMode, useSimulatedMode, roomCode, simulatedGames, playerSymbol, squares, winner])

  function makeComputerMove() {
    // Copy the current squares
    const squaresCopy = [...squares]

    // Check if there's a winner or board is full
    if (calculateWinner(squaresCopy) || squaresCopy.every((square) => square !== null)) {
      return
    }

    // Try to win
    const winningMove = findWinningMove(squaresCopy, "O")
    if (winningMove !== -1) {
      handleSquareClick(winningMove)
      return
    }

    // Block player's winning move
    const blockingMove = findWinningMove(squaresCopy, "X")
    if (blockingMove !== -1) {
      handleSquareClick(blockingMove)
      return
    }

    // Take center if available
    if (squaresCopy[4] === null) {
      handleSquareClick(4)
      return
    }

    // Take a corner if available
    const corners = [0, 2, 6, 8]
    const availableCorners = corners.filter((i) => squaresCopy[i] === null)
    if (availableCorners.length > 0) {
      const randomCorner = availableCorners[Math.floor(Math.random() * availableCorners.length)]
      handleSquareClick(randomCorner)
      return
    }

    // Take any available square
    const availableSquares = squaresCopy.map((square, i) => (square === null ? i : -1)).filter((i) => i !== -1)
    if (availableSquares.length > 0) {
      const randomSquare = availableSquares[Math.floor(Math.random() * availableSquares.length)]
      handleSquareClick(randomSquare)
    }
  }

  function findWinningMove(squares: Player[], player: Player): number {
    // Check all possible moves
    for (let i = 0; i < squares.length; i++) {
      if (squares[i] === null) {
        // Try this move
        const squaresCopy = [...squares]
        squaresCopy[i] = player

        // Check if this move wins
        if (calculateWinner(squaresCopy) === player) {
          return i
        }
      }
    }

    return -1
  }

  function handleSquareClick(i: number) {
    // Check if the move is valid
    if (winner || squares[i]) {
      return
    }

    // Check if it's the player's turn in online mode
    if (gameMode === "online" && !isMyTurn) {
      toast({
        title: "Not your turn",
        description: "Wait for your opponent to make a move.",
      })
      return
    }

    // Check if opponent is connected in online mode
    if (gameMode === "online" && !opponentConnected) {
      toast({
        title: "Waiting for opponent",
        description: "Your opponent hasn't joined yet.",
      })
      return
    }

    // Check if it's computer's turn
    if (gameMode === "computer" && !isXNext) {
      return
    }

    const newSquares = [...squares]

    if (gameMode === "online") {
      newSquares[i] = playerSymbol
    } else {
      newSquares[i] = isXNext ? "X" : "O"
    }

    // Play click sound
    if (isSoundEnabled && clickSoundRef.current) {
      try {
        clickSoundRef.current.currentTime = 0
        const playPromise = clickSoundRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.error("Click sound play failed:", e)
          })
        }
      } catch (e) {
        console.error("Error playing click sound:", e)
      }
    }

    // Update game state
    setSquares(newSquares)

    if (gameMode !== "online") {
      setIsXNext(!isXNext)
    } else {
      setIsMyTurn(false)

      // Update simulated game if using simulated mode
      if (useSimulatedMode && roomCode && simulatedGames[roomCode]) {
        const game = simulatedGames[roomCode]
        if (game) {
          updateSimulatedGame(roomCode, {
            ...game,
            squares: newSquares,
            isXNext: !game.isXNext,
          })
        }
      }
    }

    // Update history
    const newHistory = history.slice(0, currentMove + 1)
    newHistory.push({
      squares: newSquares,
      currentPlayer: isXNext ? "X" : "O",
    })
    setHistory(newHistory)
    setCurrentMove(newHistory.length - 1)

    // Send move to opponent if online and not using simulated mode
    if (gameMode === "online" && !useSimulatedMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "move",
          index: i,
          squares: newSquares,
          isXNext: !isXNext,
        }),
      )
    }
  }

  function jumpToMove(move: number) {
    if (move < 0 || move >= history.length) return

    // Only allow time travel in local mode
    if (gameMode === "online") {
      toast({
        title: "Not available",
        description: "Time travel is not available in online mode.",
      })
      return
    }

    setCurrentMove(move)
    setSquares(history[move].squares)
    setIsXNext(history[move].currentPlayer === "O")
    setWinner(calculateWinner(history[move].squares))
  }

  function resetGame(notifyOpponent = true) {
    setSquares(Array(9).fill(null))
    setIsXNext(true)
    setWinner(null)
    setHistory([])
    setCurrentMove(0)
    setShowConfetti(false)

    if (gameMode === "online") {
      setIsMyTurn(playerSymbol === "X")

      // Update simulated game if using simulated mode
      if (useSimulatedMode && roomCode && simulatedGames[roomCode]) {
        const game = simulatedGames[roomCode]
        if (game) {
          updateSimulatedGame(roomCode, {
            ...game,
            squares: Array(9).fill(null),
            isXNext: true,
            winner: null,
          })
        }
      }

      // Notify opponent about reset if not using simulated mode
      if (notifyOpponent && !useSimulatedMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "reset_game",
          }),
        )
      }
    }

    toast({
      title: "Game reset",
      description: "Starting a new game!",
    })
  }

  function toggleMusic() {
    setIsMusicPlaying(!isMusicPlaying)
  }

  function toggleSound() {
    setIsSoundEnabled(!isSoundEnabled)
  }

  function setMode(mode: "local" | "computer" | "online") {
    if (mode === gameMode) return

    // Close existing WebSocket connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Clear simulated opponent timer
    if (simulatedOpponentTimerRef.current) {
      clearTimeout(simulatedOpponentTimerRef.current)
    }

    setGameMode(mode)
    resetGame(false)

    if (mode === "online") {
      setShowLobby(true)
      setUseSimulatedMode(true) // Default to simulated mode
    } else {
      setRoomCode("")
      setOpponentConnected(false)
    }
  }

  function createRoom() {
    // Generate a random 6-character room code
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(newRoomCode)
    setIsHost(true)
    setPlayerSymbol("X")

    // Initialize simulated game if using simulated mode
    if (useSimulatedMode) {
      initializeSimulatedGame(newRoomCode)
    }

    toast({
      title: "Room created",
      description: `Share the code ${newRoomCode} with your friend.`,
    })
  }

  function joinRoom() {
    if (!joinRoomCode) {
      toast({
        title: "Enter a room code",
        description: "Please enter a valid room code to join.",
        variant: "destructive",
      })
      return
    }

    const formattedCode = joinRoomCode.toUpperCase()
    setRoomCode(formattedCode)
    setIsHost(false)
    setPlayerSymbol("O")

    // Join simulated game if using simulated mode
    if (useSimulatedMode) {
      joinSimulatedGame(formattedCode)
    }
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    toast({
      title: "Copied to clipboard",
      description: "Room code copied to clipboard.",
    })
  }

  function calculateWinner(squares: Player[]): Player | "draw" | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]

    // Check for winner
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }

    // Check for draw
    if (squares.every((square) => square !== null)) {
      return "draw"
    }

    return null
  }

  function getStatus() {
    if (winner === "draw") {
      return "It's a draw!"
    } else if (winner) {
      return `Winner: ${winner}`
    } else if (gameMode === "online") {
      return isMyTurn ? "Your turn" : "Opponent's turn"
    } else {
      return `Next player: ${isXNext ? "X" : "O"}`
    }
  }

  // Simulated online mode functions
  function initializeSimulatedGame(gameId: string) {
    // Create a new game with properly initialized squares array
    const newGame: SimulatedGame = {
      id: gameId,
      squares: Array(9).fill(null),
      isXNext: true,
      playerX: "host",
      playerO: null,
      winner: null,
    }

    // Update the simulated games state
    setSimulatedGames((prev) => ({
      ...prev,
      [gameId]: newGame,
    }))

    // Simulate waiting for opponent
    setOpponentConnected(false)

    // Simulate opponent joining after a delay
    setTimeout(() => {
      joinSimulatedGame(gameId, true)
    }, 3000)
  }

  function joinSimulatedGame(gameId: string, isSimulated = false) {
    // Check if game exists
    if (!isSimulated && !simulatedGames[gameId]) {
      // Create a new game if it doesn't exist
      const newGame: SimulatedGame = {
        id: gameId,
        squares: Array(9).fill(null),
        isXNext: true,
        playerX: "host",
        playerO: "guest",
        winner: null,
      }

      setSimulatedGames((prev) => ({
        ...prev,
        [gameId]: newGame,
      }))
    } else if (simulatedGames[gameId]) {
      // Update existing game
      updateSimulatedGame(gameId, {
        ...simulatedGames[gameId],
        playerO: isSimulated ? "simulated" : "guest",
      })
    } else {
      // Handle case where game doesn't exist but we're trying to join as simulated
      const newGame: SimulatedGame = {
        id: gameId,
        squares: Array(9).fill(null),
        isXNext: true,
        playerX: "host",
        playerO: isSimulated ? "simulated" : "guest",
        winner: null,
      }

      setSimulatedGames((prev) => ({
        ...prev,
        [gameId]: newGame,
      }))
    }

    // Set opponent as connected
    setOpponentConnected(true)

    // Show toast if not simulated
    if (!isSimulated) {
      toast({
        title: "Joined game",
        description: `You've joined the game as player O.`,
      })
    } else {
      toast({
        title: "Opponent connected!",
        description: "The game can now begin.",
      })
    }

    // Close lobby
    setShowLobby(false)
  }

  function updateSimulatedGame(gameId: string, updatedGame: SimulatedGame) {
    // Ensure squares is always an array
    if (!Array.isArray(updatedGame.squares)) {
      console.error("Attempting to update game with invalid squares:", updatedGame.squares)
      updatedGame.squares = Array(9).fill(null)
    }

    setSimulatedGames((prev) => ({
      ...prev,
      [gameId]: updatedGame,
    }))
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
      {/* Confetti effect when someone wins */}
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          colors={["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff99c8", "#fcf6bd", "#d0f4de"]}
        />
      )}

      <h1 className="text-4xl font-bold text-white mb-2">Tic-Tac-Toe</h1>

      <Tabs defaultValue="computer" className="w-full" onValueChange={(value) => setMode(value as any)}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="computer" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" /> vs Computer
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Local 2P
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Online
          </TabsTrigger>
        </TabsList>

        <TabsContent value="computer" className="mt-0">
          <div className="flex flex-col md:flex-row gap-8 w-full">
            <div className="flex-1">
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xl font-semibold text-white">{getStatus()}</div>
                  <Button variant="outline" size="icon" onClick={() => resetGame()} className="h-8 w-8">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {squares.map((square, i) => (
                    <button
                      key={i}
                      className={cn(
                        "h-24 md:h-28 flex items-center justify-center text-4xl font-bold rounded-md transition-all duration-200 transform hover:scale-105",
                        square === "X"
                          ? "bg-emerald-600 text-white"
                          : square === "O"
                            ? "bg-amber-600 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600",
                        winner &&
                          winner !== "draw" &&
                          calculateWinner([...squares]) === square &&
                          [0, 1, 2, 3, 4, 5, 6, 7, 8].some((j) => {
                            const lines = [
                              [0, 1, 2],
                              [3, 4, 5],
                              [6, 7, 8],
                              [0, 3, 6],
                              [1, 4, 7],
                              [2, 5, 8],
                              [0, 4, 8],
                              [2, 4, 6],
                            ]
                            return lines.some(
                              (line) =>
                                line.includes(i) &&
                                line.includes(j) &&
                                squares[i] === squares[j] &&
                                line.every((idx) => squares[idx] === squares[i]),
                            )
                          })
                          ? "ring-4 ring-white animate-pulse"
                          : "",
                      )}
                      onClick={() => handleSquareClick(i)}
                      disabled={!!winner || !!square || (!isXNext && gameMode === "computer")}
                    >
                      {square}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="icon" onClick={toggleMusic} className="h-8 w-8">
                    {isMusicPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSound}
                    className={cn("h-8 w-8", !isSoundEnabled && "text-slate-500")}
                  >
                    <Trophy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>

            <div className="flex-1">
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-xl h-full">
                <h2 className="text-xl font-semibold mb-4">Game History</h2>

                {history.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {history.map((_, move) => (
                      <Button
                        key={move}
                        variant={move === currentMove ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => jumpToMove(move)}
                      >
                        {move === 0 ? "Game start" : `Move #${move}: Player ${history[move].currentPlayer}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">No moves yet. Start playing!</div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="local" className="mt-0">
          <div className="flex flex-col md:flex-row gap-8 w-full">
            <div className="flex-1">
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xl font-semibold text-white">{getStatus()}</div>
                  <Button variant="outline" size="icon" onClick={() => resetGame()} className="h-8 w-8">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {squares.map((square, i) => (
                    <button
                      key={i}
                      className={cn(
                        "h-24 md:h-28 flex items-center justify-center text-4xl font-bold rounded-md transition-all duration-200 transform hover:scale-105",
                        square === "X"
                          ? "bg-emerald-600 text-white"
                          : square === "O"
                            ? "bg-amber-600 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600",
                        winner &&
                          winner !== "draw" &&
                          calculateWinner([...squares]) === square &&
                          [0, 1, 2, 3, 4, 5, 6, 7, 8].some((j) => {
                            const lines = [
                              [0, 1, 2],
                              [3, 4, 5],
                              [6, 7, 8],
                              [0, 3, 6],
                              [1, 4, 7],
                              [2, 5, 8],
                              [0, 4, 8],
                              [2, 4, 6],
                            ]
                            return lines.some(
                              (line) =>
                                line.includes(i) &&
                                line.includes(j) &&
                                squares[i] === squares[j] &&
                                line.every((idx) => squares[idx] === squares[i]),
                            )
                          })
                          ? "ring-4 ring-white animate-pulse"
                          : "",
                      )}
                      onClick={() => handleSquareClick(i)}
                      disabled={!!winner || !!square}
                    >
                      {square}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="icon" onClick={toggleMusic} className="h-8 w-8">
                    {isMusicPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSound}
                    className={cn("h-8 w-8", !isSoundEnabled && "text-slate-500")}
                  >
                    <Trophy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>

            <div className="flex-1">
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-xl h-full">
                <h2 className="text-xl font-semibold mb-4">Game History</h2>

                {history.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {history.map((_, move) => (
                      <Button
                        key={move}
                        variant={move === currentMove ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => jumpToMove(move)}
                      >
                        {move === 0 ? "Game start" : `Move #${move}: Player ${history[move].currentPlayer}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">No moves yet. Start playing!</div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="online" className="mt-0">
          <div className="flex flex-col md:flex-row gap-8 w-full">
            <div className="flex-1">
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xl font-semibold text-white">
                    {getStatus()}
                    {gameMode === "online" && (
                      <span
                        className={cn(
                          "ml-2 inline-block w-3 h-3 rounded-full",
                          opponentConnected ? "bg-green-500" : "bg-red-500",
                        )}
                      ></span>
                    )}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => resetGame()} className="h-8 w-8">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {roomCode ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {squares.map((square, i) => (
                        <button
                          key={i}
                          className={cn(
                            "h-24 md:h-28 flex items-center justify-center text-4xl font-bold rounded-md transition-all duration-200 transform hover:scale-105",
                            square === "X"
                              ? "bg-emerald-600 text-white"
                              : square === "O"
                                ? "bg-amber-600 text-white"
                                : "bg-slate-700 text-slate-400 hover:bg-slate-600",
                            winner &&
                              winner !== "draw" &&
                              calculateWinner([...squares]) === square &&
                              [0, 1, 2, 3, 4, 5, 6, 7, 8].some((j) => {
                                const lines = [
                                  [0, 1, 2],
                                  [3, 4, 5],
                                  [6, 7, 8],
                                  [0, 3, 6],
                                  [1, 4, 7],
                                  [2, 5, 8],
                                  [0, 4, 8],
                                  [2, 4, 6],
                                ]
                                return lines.some(
                                  (line) =>
                                    line.includes(i) &&
                                    line.includes(j) &&
                                    squares[i] === squares[j] &&
                                    line.every((idx) => squares[idx] === squares[i]),
                                )
                              })
                              ? "ring-4 ring-white animate-pulse"
                              : "",
                          )}
                          onClick={() => handleSquareClick(i)}
                          disabled={!!winner || !!square || !isMyTurn || !opponentConnected}
                        >
                          {square}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-4 mb-4">
                      <div className="flex items-center justify-between bg-slate-700 p-3 rounded-md">
                        <div>
                          <span className="text-sm text-slate-300">Room Code:</span>
                          <span className="ml-2 font-mono font-bold">{roomCode}</span>
                        </div>
                        <Button variant="outline" size="sm" className="h-8" onClick={copyRoomCode}>
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between bg-slate-700 p-3 rounded-md">
                        <div>
                          <span className="text-sm text-slate-300">You are:</span>
                          <span
                            className={cn(
                              "ml-2 font-bold",
                              playerSymbol === "X" ? "text-emerald-500" : "text-amber-500",
                            )}
                          >
                            {playerSymbol}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-300">Status:</span>
                          <span className={cn("ml-2", opponentConnected ? "text-green-500" : "text-red-500")}>
                            {opponentConnected ? "Opponent connected" : "Waiting for opponent"}
                          </span>
                        </div>
                      </div>

                      {useSimulatedMode && (
                        <div className="bg-blue-900/30 border border-blue-500/30 p-3 rounded-md text-sm">
                          <p className="font-medium text-blue-300 mb-1">Simulated Online Mode</p>
                          <p className="text-blue-200">
                            Playing in simulated mode with an AI opponent. This mode works without an internet
                            connection.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4 py-4">
                    <Button onClick={createRoom} className="w-full">
                      Create New Game
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-800 px-2 text-slate-400">Or</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter room code"
                        value={joinRoomCode}
                        onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                        className="flex-1"
                        maxLength={6}
                      />
                      <Button onClick={joinRoom}>Join Game</Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="icon" onClick={toggleMusic} className="h-8 w-8">
                    {isMusicPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSound}
                    className={cn("h-8 w-8", !isSoundEnabled && "text-slate-500")}
                  >
                    <Trophy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>

            <div className="flex-1">
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-xl h-full">
                <h2 className="text-xl font-semibold mb-4">Game Info</h2>

                {roomCode ? (
                  <div className="space-y-4">
                    <div className="bg-slate-700 p-4 rounded-md">
                      <h3 className="font-medium mb-2">How to Play Online</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                        <li>Share the room code with your friend</li>
                        <li>Wait for them to join the game</li>
                        <li>Player X (creator) goes first</li>
                        <li>Take turns making moves</li>
                        <li>The game will show whose turn it is</li>
                      </ul>
                    </div>

                    {history.length > 0 && (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        <h3 className="font-medium">Game History</h3>
                        {history.map((_, move) => (
                          <div
                            key={move}
                            className={cn(
                              "p-2 rounded-md text-sm",
                              move === currentMove ? "bg-slate-700" : "bg-slate-700/50",
                            )}
                          >
                            {move === 0 ? "Game start" : `Move #${move}: Player ${history[move].currentPlayer}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-700 p-4 rounded-md">
                    <h3 className="font-medium mb-2">Online Multiplayer</h3>
                    <p className="text-sm text-slate-300 mb-4">
                      Play Tic-Tac-Toe with a friend online! Create a new game and share the room code, or join an
                      existing game with a code.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                      <li>Real-time gameplay</li>
                      <li>Play from anywhere</li>
                      <li>No account required</li>
                      <li>Instant connection</li>
                    </ul>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showLobby} onOpenChange={setShowLobby}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Lobby</DialogTitle>
            <DialogDescription>
              {isHost ? "Share this code with your friend to join the game." : "Waiting for the game to start..."}
            </DialogDescription>
          </DialogHeader>

          <GameLobby
            roomCode={roomCode}
            isHost={isHost}
            opponentConnected={opponentConnected}
            onCopyCode={copyRoomCode}
            copied={copied}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

