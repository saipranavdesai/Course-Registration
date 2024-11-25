const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const urlencoded = require("body-parser/lib/types/urlencoded");

const app = express();
const port = 13000;

// Configure body-parser middleware to parse JSON and urlencoded request bodies
app.use(bodyParser.urlencoded({ extended: false }));

// Configure the PostgreSQL connection pool
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "univ",
  password: "postgres",
  port: 11000, // Default PostgreSQL port
});

app.get("/", (req, res) => {
  return res.send("Hello, World!");
});

// Serve login.html at http://localhost:13000/login.html
app.get("/login.html", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

// Handle POST request to http://localhost:13000/logincheck
app.post("/logincheck", async (req, res) => {
  const { role, userid, password } = req.body;

  const values = [userid, password ];
  let query;
  try {
    switch (role) {
      case 'admin':
        query = `SELECT (password_hash = crypt($2, password_hash)) AS pswmatch FROM loginuser  WHERE admin_id = $1 and role = 'admin' ;`;
        break;
      case 'student':
        query = `SELECT (password_hash = crypt($2, password_hash)) AS pswmatch FROM loginuser  WHERE stud_id = $1 and role = 'student' ;`;
        break;
      case 'instructor':
        query = `SELECT (password_hash = crypt($2, password_hash)) AS pswmatch FROM loginuser  WHERE ins_id = $1 and role = 'instructor' ;`;
        break;
      default:
        throw new Error('Invalid role');
    }
    // const query = 'select * from loginuser'
    const result = await pool.query(query, values);
    console.log(result.rows);

    // Check the result to determine login success or failure
    const loginSuccess = result.rows[0].pswmatch;

    if (loginSuccess) {
      res.send(`login success as ${role}`);
    } else {
      res.send(`login failure as ${role}`);
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).send("Internal server error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
