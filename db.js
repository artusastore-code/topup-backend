const mysql = require("mysql2");

const db = mysql.createConnection({
  uri: process.env.MYSQL_URL
});

db.connect((err) => {
  if (err) {
    console.log("DB Error:", err);
  } else {
    console.log("Database connected ✅");
  }
});

module.exports = db;