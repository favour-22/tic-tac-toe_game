# Tic-Tac-Toe Game

Welcome to the Tic-Tac-Toe Game! This project is a dynamic and interactive Tic-Tac-Toe game built using TypeScript, React, and Next.js. It supports local play, computer play, and online multiplayer modes.

## Features

- **Local Play**: Play Tic-Tac-Toe with another player on the same device.
- **Computer Play**: Compete against an AI opponent with basic move strategies.
- **Online Multiplayer**: Play with friends online by creating or joining a game room.
- **Game History**: View the history of moves made during the game and jump to any move.
- **Sound Effects**: Enjoy background music and sound effects for clicks and wins.
- **Responsive Design**: The game is fully responsive and works well on both desktop and mobile devices.

## Getting Started

### Prerequisites

Ensure you have the following installed on your local development machine:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (version 6 or higher) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/favour-22/tic-tac-toe_game.git
   cd tic-tac-toe_game
   ```

2. Install the dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Development Server

To start the development server, run:

```bash
npm run dev
# or
yarn dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to see the game in action.

### Building for Production

To build the project for production, run:

```bash
npm run build
# or
yarn build
```

This will create an optimized production build in the `out` directory.

### Running in Production

To run the production build, first ensure you have built the project, then execute:

```bash
npm run start
# or
yarn start
```

## How to Play

### Local Play

1. Select "Local 2P" mode.
2. Players take turns clicking on the grid to place their X or O.
3. The first player to get three in a row (horizontally, vertically, or diagonally) wins.

### Computer Play

1. Select "vs Computer" mode.
2. You will play as "X" and the computer will play as "O".
3. Take turns clicking on the grid to place your X. The computer will make its move automatically.

### Online Multiplayer

1. Select "Online" mode.
2. Create a new game or join an existing game using a room code.
3. Share the room code with your friend if you are the host.
4. Take turns making moves. The game will indicate whose turn it is.

## Project Structure

- `components/`: Contains React components used throughout the game.
- `pages/`: Contains Next.js page components.
- `public/`: Contains static assets like images and audio files.
- `styles/`: Contains CSS and stylesheet files.
- `lib/`: Contains utility functions used across the project.
- `hooks/`: Contains custom React hooks.

## Contributing

Contributions are welcome! If you find any bugs or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Acknowledgements

- [React](https://reactjs.org/)
- [Next.js](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Lucide Icons](https://lucide.dev/)

Enjoy playing Tic-Tac-Toe!

