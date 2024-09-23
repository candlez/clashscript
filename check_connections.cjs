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

const fields = ["battle1", "battle2", "battle3", "battle4", "battle5", "battle6", "battle7", "battle8"];

const map = new Map();

const getCount = (player) => {
    let count = 0;
    while (player[fields[count]] !== null && count < 8) {
        count++;
    }
    return count;
}

const indexOf = (player, tag) => {
    for (let i = 0; i < 8; i++) {
        const oppTag = player[fields[i]];
        if (oppTag !== null) {
            if (oppTag === tag) {
                return i;
            }
        } else {
            break;
        }
    }
    return -1;
}

const checkConnecions = (tag) => {
    let flag = false;
    const playerObj = map.get(tag);
    const player = playerObj.player;
    for (let i = 0; i < 8; i++) {
        const oppTag = player[fields[i]];
        if (oppTag !== null) {
            const oppObj = map.get(oppTag);
            const index = indexOf(oppObj.player, player.tag);
            if (index === -1) {
                if (oppObj.count < 8) {
                    oppObj.player[fields[oppObj.count]] = player.tag;
                    oppObj.count++;
                    oppObj.changed = true;
                    map.set(oppObj.player.tag, oppObj);
                } else {
                    playerObj.player[fields[i]] = null;
                    playerObj.count--;
                    flag = true;
                }
            }
        } else {
            break;
        }
    }
    if (flag) {
        playerObj.changed = true;
        let count = 0;
        let index = 0;
        while (count < playerObj.count) {
            const tag = playerObj.player[fields[index]];
            if (tag !== null) {
                playerObj.player[fields[index]] = null;
                playerObj.player[fields[count]] = tag;
                count++;
            }
            index++;
        }
        map.set(player.tag, playerObj);
    }
}

const submitPlayer = async (player, connection) => {
    try {
        await connection.query(
            "UPDATE players SET battle1 = ?, battle2 = ?, battle3 = ?, battle4 = ?, battle5 = ?, battle6 = ?, battle7 = ?, battle8 = ? WHERE tag = ?;",
            [player.battle1, player.battle2, player.battle3, player.battle4, player.battle5, player.battle6, player.battle7, player.battle8, player.tag]
        );
    } catch (error) {
        console.log("failed to submit player", player);
        process.exit();
    }
}

const main = async () => {
    const connection = await db.getConnection();
    let players;

    try {
        [players] = await connection.query("SELECT tag, battle1, battle2, battle3, battle4, battle5, battle6, battle7, battle8 FROM players;");
        console.log("got players");
    } catch (error) {
        console.error(error);
        console.log("couldn't get players");
        process.exit();
    }

    for (let i = 0; i < players.length; i++) {
        map.set(players[i].tag, {player: players[i], count: getCount(players[i]), changed: false});
    }

    console.log("prepared map");

    for (let i = 0; i < players.length; i++) {
        checkConnecions(players[i].tag);
    }

    console.log("edited map");

    for (let i = 0; i < players.length; i++) {
        const obj = map.get(players[i].tag);
        if (obj.changed) {
            await submitPlayer(obj.player, connection);
            console.log(obj.player.tag + "++");
        }
    }

    console.log("resubmitted map");

    connection.release();
}

main();