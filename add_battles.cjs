require("dotenv").config();
const mysql = require("mysql2/promise");
const axios = require("axios");

const db = mysql.createPool({
    host: "127.0.0.1",
    port: 3304,
    user: "root",
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: "clash",
    waitForConnections: true,
    connectionLimit: 150,
    queueLimit: 0
});

console.log("connected to database");

const baseURL = "https://api.clashroyale.com/v1";

let rateLimitFlag = false;

const wait = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let tokenFlag = 0;

const getToken = () => {
    tokenFlag = ++tokenFlag % 10;
    switch (tokenFlag) {
        case 0:
            return process.env.API_TOKEN;
        case 1:
            return process.env.ALTERNATE_TOKEN_1;
        case 2:
            return process.env.ALTERNATE_TOKEN_2;
        case 3:
            return process.env.ALTERNATE_TOKEN_3;
        case 4:
            return process.env.ALTERNATE_TOKEN_4;
        case 5:
            return process.env.ALTERNATE_TOKEN_5;
        case 6:
            return process.env.ALTERNATE_TOKEN_6;
        case 7:
            return process.env.ALTERNATE_TOKEN_7;
        case 8:
            return process.env.ALTERNATE_TOKEN_8;
        case 9:
            return process.env.ALTERNATE_TOKEN_9;
    }
}

const addBattles = async (tag) => {
    let connection;

    try {
        let log = await axios.get(
            `${baseURL}/players/%23${tag}/battlelog`,
            {headers: {"Authorization": `Bearer ${getToken()}`}}
        );
        tokenFlag = !tokenFlag;
        log = log.data;
        const opps = [null, null, null, null, null, null, null, null];
        let count = 0;
        let i = 0;
        const set = new Set();
        while (count < 8 && i < log.length) {
            const oppTag = log[i].opponent[0].tag;
            if (!set.has(oppTag)) {
                set.add(oppTag);
                opps[count] = oppTag;
                count++;
            }
            i++;
        }

        connection = await db.getConnection();

        const res = await connection.query(
            `UPDATE players SET battle1 = ?, battle2 = ?, battle3 = ?, battle4 = ?, battle5 = ?, battle6 = ?, battle7 = ?, battle8 = ? WHERE tag = ?`,
            [...opps, "#" + tag]
        );
    } catch (error) {
        if (error.status === 429) {
            rateLimitFlag = true;
        } else if (error.code === "ETIMEDOUT") {
            rateLimitFlag = true;
        } else if (error.code === "ECONNRESET") {
            rateLimitFlag = true;
        } else {
            console.error(error);
            console.log("problem adding battles for: ", tag);
            process.exit();
        }

    } finally {
        if (connection) connection.release();
    }

}

const doBatch = async (limit, offset, connection) => {
    let tags;
    try {
        [tags] = await connection.query("SELECT (tag) FROM players WHERE battle1 IS NULL LIMIT ? OFFSET ?;", [limit, offset * 1000]);
        for (let j = 0; j < tags.length; j++) {
            if (rateLimitFlag) {
                console.log("Rate Limited :(");
                await wait(500);
                rateLimitFlag = false;
            }
            console.log(tags[j].tag);
            addBattles(tags[j].tag.slice(1, 15));
            await wait(4);
        }
    } catch (error) {
        if (error.status === 429) {
            console.log("rate limited");
        } else {
            console.error(error);
            process.exit();
        }
    }
}

const main = async () => {
    const start = process.env.START || 0;

    let total;
    const connection1 = await db.getConnection();

    try {
        total = await connection1.query("SELECT COUNT(CASE WHEN battle1 IS NULL THEN 1 END) from players;");
    } catch (error) {
        console.log("failed to get total")
        process.exit();
    }

    total = total[0][0]['COUNT(CASE WHEN battle1 IS NULL THEN 1 END)'];
    console.log(total);

    await doBatch(total, 0, connection1);


    connection1.release();
}

main();