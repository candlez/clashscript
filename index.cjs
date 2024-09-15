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
    connectionLimit: 100,
    queueLimit: 0
});

console.log("connected to database");

const baseURL = "https://api.clashroyale.com/v1";

const seedTag = process.env.SEED_TAG || "8VPLP09VY";

const wait = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const trawlLogs = async (tag) => {
    const tags = [];

    const connection = await db.getConnection();

    try {
        const res = await axios.get(
            `${baseURL}/players/%23${tag}/battlelog`,
            {headers: {"Authorization": `Bearer ${process.env.API_TOKEN}`}}
        );

        for (let i = 0; i < res.data.length; i++) {
            const oppTag = res.data[i].opponent[0].tag;
            const oppName = res.data[i].opponent[0].name;

            const [dbres] = await connection.query("SELECT * FROM players WHERE tag = ?", oppTag);

            if (dbres.length === 0) {
                console.log(oppTag);
                await connection.query("INSERT INTO players VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)", [oppTag, oppName]);
                tags.push(oppTag);
            }
        }
    } catch (error) {
        if (error.status == 429) {
            console.log("rate limited :(");
            await wait(5000);
        } else if (error.code === "ER_DUP_ENTRY") {
            console.log("duplicated and whatnot");
        } else {
            console.error(error);
            process.exit();
        }
    } finally {
        connection.release();
    }

    for (let i = 0; i < tags.length; i++) {
        trawlLogs(tags[i].slice(1, 15));
    }
}

const main = async () => {
    await trawlLogs(seedTag);
}

main();