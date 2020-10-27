var http = require("http");
var express = require("express");
var app = express();
var socketIo = require("socket.io");
var fs = require("fs");
var server = http.Server(app).listen(8080);
var io = socketIo(server);
var clients = {};
// Serve static resources
app.use(express.static(__dirname + "/../client/"));
app.use(express.static(__dirname + "/../node_modules/"));
app.get("/", function (req, res) {
    var stream = fs.createReadStream(__dirname + "/../client/index.html");
    stream.pipe(res);
});
var players = {}; // opponent: scoket.id of the opponent, symbol = "X" | "O", socket: player's socket
var unmatched;
// When a client connects
io.on("connection", function (socket) {
    var id = socket.id;
    console.log("New client connected. ID: ", socket.id);
    clients[socket.id] = socket;
    socket.on("disconnect", function () {
        console.log("Client disconnected. ID: ", socket.id);
        delete clients[socket.id];
        socket.broadcast.emit("clientdisconnect", id);
    });
    join(socket); // Fill 'players' data structure
    if (opponentOf(socket)) { // If the current player has an opponent the game can begin
        socket.emit("game.begin", {
            symbol: players[socket.id].symbol
        });
        opponentOf(socket).emit("game.begin", {
            symbol: players[opponentOf(socket).id].symbol
        });
    }
    // Event for when any player makes a move
    socket.on("make.move", function (data) {
        if (!opponentOf(socket)) {
            // This shouldn't be possible since if a player doens't have an opponent the game board is disabled
            return;
        }
        // Validation of the moves can be done here
        socket.emit("move.made", data); // Emit for the player who made the move
        opponentOf(socket).emit("move.made", data); // Emit for the opponent
    });
    // Event to inform player that the opponent left
    socket.on("disconnect", function () {
        if (opponentOf(socket)) {
            opponentOf(socket).emit("opponent.left");
        }
    });
});
function join(socket) {
    players[socket.id] = {
        opponent: unmatched,
        symbol: "X",
        socket: socket
    };
    // If 'unmatched' is defined it contains the socket.id of the player who was waiting for an opponent
    // then, the current socket is player #2
    if (unmatched) {
        players[socket.id].symbol = "O";
        players[unmatched].opponent = socket.id;
        unmatched = null;
    }
    else { //If 'unmatched' is not define it means the player (current socket) is waiting for an opponent (player #1)
        unmatched = socket.id;
    }
}
function opponentOf(socket) {
    if (!players[socket.id].opponent) {
        return;
    }
    return players[players[socket.id].opponent].socket;
}
//# sourceMappingURL=server.js.map