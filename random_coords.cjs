require("dotenv").config();
const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "127.0.0.1",
    port: 3304,
    user: "root",
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: "clash",
    waitForConnections: true,
    connectionLimit: 150,
    queueLimit: 0,
    connectTimeout: 60000
});

console.log("connected to database");

const grid = new Map();

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const getRandomCoordinates = () => {
    const x = getRandomInt(8001) - 4000;
    const y = getRandomInt(8001) - 4000;
    if (!grid.has(x)) {
        let set = new Set();
        set.add(y);
        grid.set(x, set);
        return {x: x, y: y};
    }
    if (!grid.get(x).has(y)) {
        grid.get(x).add(y);
        return {x: x, y: y};
    }
    return getRandomCoordinates();
}

const main = async () => {
    const connection = await db.getConnection();
    let players;

    try {
        [players] = await connection.query("SELECT tag FROM players WHERE battle1 IS NOT NULL;");
        console.log("got players");
    } catch (error) {
        console.error(error);
        console.log("couldn't get players");
        process.exit();
    }

    for (let i = 0; i < players.length; i++) {
        coords = getRandomCoordinates();
        try {
            await connection.query(
                "UPDATE players SET random_x = ?, random_y = ? WHERE tag = ?;",
                [coords.x, coords.y, players[i].tag]
            );
        } catch (error) {
            console.error(error);
            console.log("failed on: ", players[i]);
            process.exit();
        }
        if (i % 10000 == 0) {
            console.log(i);
        }
    }

    connection.release();
}

main();
