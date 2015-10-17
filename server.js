var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    fs = require("fs"),
    Player = require("./public/js/Player"),
    Food = require("./public/js/Food"),
    players = [],
    food = [],
    fps = 20,
    intervalId;

function init() {
    app.get("/js/game.js", function (req, res) {
        res.set("Content-Type", "text/javascript");
        res.send(fs.readFileSync(__dirname + "/public" + req.path, {encoding: "utf8"})
            .replace(/{{\s*url\s*}}/, req.protocol + "://" +  req.get("host")));
    });
    app.use(express.static(__dirname + '/public'));
    server.listen(8000);
    setEventHandlers();
    intervalId = setInterval(update, 1000 / fps);
    console.log('Magic on port 8000');
};

function setEventHandlers(){
    io.on('connection', function(client) {
        console.log('Client connected...');
        client.on('join', function(data) {
            console.log(data);
        });
        client.on("disconnect", onClientDisconnect);
        client.on("new player", onNewPlayer);
        client.on("change direction", changeDirection);
    });
};

function onClientDisconnect() {
    console.log("Player has disconnected: "+this.id);
    console.log("Removing plz");
    var removePlayer = playerById(this.id);
    if (!removePlayer) {
        console.log("Player not found: "+this.id);
        return;
    };
    players.splice(players.indexOf(removePlayer), 1);
};

function onNewPlayer(data) {
    var newPlayer = new Player(data.x, data.y);
    newPlayer.id = this.id;
    players.push(newPlayer);
};

function changeDirection(data) {
    var player = playerById(this.id);

    if (!player) {
        console.log("Player not found: "+this.id);
        return;
    }
    switch (data.direction) {
        case "u": if (player.direction === "d") return; break;
        case "d": if (player.direction === "u") return; break;
        case "l": if (player.direction === "r") return; break;
        case "r": if (player.direction === "l") return; break;
    }
    player.direction = data.direction;
};


function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id === id)
            return players[i];
    };

    return false;
};

function update() {
    players.forEach(function(p) {
        if (!p.update(players)) {
            console.log("Yolo");
            io.emit("remove player", {id: p.id});
            players.splice(players.indexOf(p), 1);
        }
        for (i = 0; i < food.length; i++) {
            foodStr = JSON.stringify(food[i].pos);
            if (JSON.stringify(p.segments[0]) === foodStr) {
                p.grow();
                food.splice(i, 1);
            }
        }
    });

    while (food.length < 4){
        food.push(new Food());
    }
    io.emit("get objects", {players: players, food: food});
}

init();
