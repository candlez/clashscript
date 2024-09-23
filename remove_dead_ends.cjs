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
// const map = new Map();
const set1 = new Set();
const set2 = new Set();

const removeDeadEnds = async (player) => {
    const connection = await db.getConnection();

    try {
        let count = 0;
        const battles = [null, null, null, null, null, null, null, null];
        let changeFlag = false;
        for (let i = 0; i < 8; i++) {
            const oppTag = player[fields[i]];
            if (oppTag !== null) {
                if (set1.has(oppTag) || set2.has(oppTag)) {
                    battles[count] = oppTag;
                    count++;
                } else {
                    changeFlag = true;
                }
                // if (map.has(oppTag)) {
                //     if (map.get(oppTag) === true) {
                //         battles[count] = oppTag;
                //         count++;
                //     } else {
                //         changeFlag = true;
                //     }
                // } else {
                //     const [res] = await connection.query("SELECT 1 FROM players WHERE tag = ? LIMIT 1;", oppTag);
                //     if (res.length === 1) {
                //         map.set(oppTag, true);
                //         battles[count] = oppTag;
                //         count++;
                //     } else {
                //         map.set(oppTag, false);
                //         changeFlag = true;
                //     }
                // }
            } else {
                break;
            }
        }

        if (changeFlag) {
            await connection.query("UPDATE players SET battle1 = ?, battle2 = ?, battle3 = ?, battle4 = ?, battle5 = ?, battle6 = ?, battle7 = ?, battle8 = ? WHERE tag = ?;",
                [...battles, player.tag]
            );
            console.log(player.tag + "--");
        } else {
            console.log(player.tag);
        }

    } catch (error) {
        console.error(error);
        process.exit();
    } finally {
        connection.release();
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
        if (i % 2 === 0) {
            set1.add(players[i].tag);
        } else {
            set2.add(players[i].tag);
        }
    }

    console.log("prepared set");

    for (let i = 0; i < players.length; i++) {
        await removeDeadEnds(players[i]);
    }

    connection.release();
}

main();