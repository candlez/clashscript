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

const removeDuplicates = async (player) => {
    const set = new Set();
    const battles = [null, null, null, null, null, null, null, null]
    let count = 0;
    let flag = false;
    for (let i = 0; i < 8; i++) {
        oppTag = player[fields[i]];
        if (oppTag !== null) {
            if (set.has(oppTag)) {
                flag = true;
            } else {
                set.add(oppTag);
                battles[count] = oppTag;
                count++;
            }
        } else {
            break;
        }
    }

    if (flag) {
        const connection = await db.getConnection();

        try {
            await connection.query("UPDATE players SET battle1 = ?, battle2 = ?, battle3 = ?, battle4 = ?, battle5 = ?, battle6 = ?, battle7 = ?, battle8 = ? WHERE tag = ?;",
                [...battles, player.tag]
            );
            console.log(player.tag + "--");
        } catch (error) {
            console.error(error);
            process.exit();
        } finally {
            connection.release();
        }
    } else {
        console.log(player.tag);
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
        await removeDuplicates(players[i]);
    }

    connection.release();
}

main();