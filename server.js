const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const jwt =require("jsonwebtoken");
const app = express();
const port = 13000;

const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Configure body-parser middleware to parse JSON and urlencoded request bodies
app.use(bodyParser.urlencoded({ extended: false }));

var sem='Spring';
var yr=2024;
// Configure the PostgreSQL connection pool
const pool = new Pool({
  user: "postgres",
  host: "db",
  database: "univ_lab6",
  password: "postgres",
  port: 5432, // Default PostgreSQL port
});

app.get("/", (req, res) => {
  return res.send("Hello, World!");
});

// Serve login.html at http://localhost:13000/login.html
app.get("/login.html", (req, res) => {
  res.sendFile(__dirname + "/labDirectory/login.html");
});

// Handle POST request to http://localhost:13000/logincheck
app.post("/logincheck", async (req, res) => {
  const { role, userid, password } = req.body;

  const values = [userid, password ];
  let query;
  try {
    switch (role) {
      case 'admin':
        query = `SELECT (password_hash = crypt('`+password+`', password_hash)) AS pswmatch FROM loginuser  WHERE role = 'admin' and admin_id = '`+userid+`';`;
        break;
      case 'student':
        query = `SELECT (password_hash = crypt('`+password+`', password_hash)) AS pswmatch FROM loginuser  WHERE  role = 'student' and stud_id = '`+userid+`' ;`;
        break;
      case 'instructor':
        query = `SELECT (password_hash = crypt('`+password+`', password_hash)) AS pswmatch FROM loginuser  WHERE  role = 'instructor' and ins_id = '`+userid+`' ;`;
        break;
      default:
        throw new Error('Invalid role');
    }
    const result = await pool.query(query);

    // Check the result to determine login success or failure
    const loginSuccess = result.rows[0].pswmatch;

    if (loginSuccess) {
      const token = jwt.sign({ id: userid, role: role }, "YOUR_SECRET_KEY");
      const refresh= `<meta http-equiv="refresh" content="10;URL='http://localhost:13000/dashboard.html'"/>`
      return res
        .cookie("access_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production",})
        .status(200)
        .send(`login success as ${role} ${refresh}`);
    } 
    else {
      res.send(`login failure as ${role}`);
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).send("Internal server error");
  }
});
const authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.verify(token, "YOUR_SECRET_KEY");
    req.userId = data.id;
    req.userRole = data.role;
    return next();
  } catch {
    res.send("User not logged in");
    return res.sendStatus(403);
  }
};
app.get("/dashboard.html",authorization, async (req, res) => {
  res.set("Content-Type","text/html");
  res.write(`userid=${req.userId} <br> role=${req.userRole}`);
  let query;
  query=`select course_id as courses , sec_id as sections from section where semester='${sem}' and year=${yr} ;`;
  const result = await pool.query(query);
  const regs = [];
  for (let i = 0; i < result.rows.length; i++) {
    query=`SELECT EXISTS (SELECT 1 FROM takes WHERE year=${yr} and semester='${sem}' and course_id = '${result.rows[i].courses}' and sec_id = '${result.rows[i].sections}') as ps;`;
    const resu = await pool.query(query);
    if (resu.rows[0].ps) {
      regs.push("Registered");
    } 
    else {
      regs.push("Not Registered");
    }
  }
  let html = '<table border="1">';
  html += '<thead><tr><th>Course ID</th><th>Sec ID</th><th>Registration Status</th></tr></thead>';
  html += '<tbody>';
  for (let i = 0; i < regs.length; i++) {
      html += '<tr>';
      html += `<td>${result.rows[i].courses}</td>`;
      html += `<td>${result.rows[i].sections}</td>`;
      html += `<td>${regs[i]}</td>`;
      html += '</tr>';
  }
  html += '</tbody></table>';
  res.write(html);

  let htm = `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Registration</title>
  </head>
  <body>
    <h1>Course Registration</h1>
    <form action="/register.html" method="post">
      <label for="courseid">Course ID:</label>
      <input type="text" id="courseid" name="courseid" required><br>
      <label for="secid">Section ID:</label>
      <input type="text" id="secid" name="secid" required><br>
      <button type="submit" id="register">Register</button>
    </form>
  </body>`
  res.write(htm);
});
app.post("/register.html",authorization, async (req, res) => {
  res.set("Content-Type","text/html");
  const { courseid, secid } = req.body;
  let query;
  query=`SELECT EXISTS (SELECT 1 FROM takes WHERE ID='${req.userId}' and course_id = '${courseid}') as ps;`;
  const result = await pool.query(query);
  if(result.rows[0].ps){
    return res.write("Registration failed - already registered");
  }
  query=`SELECT count(ID) as ps FROM takes WHERE year=${yr} and semester='${sem}' and sec_id = '${secid}' and course_id = '${courseid}' ;`;
  q2=`select registration_limit as r_l from section where year=${yr} and semester='${sem}' and  sec_id = '${secid}' and course_id = '${courseid}' `;
  const r = await pool.query(query);
  const s = await pool.query(q2);
  if(r.rows[0].ps==s.rows[0].r_l){
    return res.write("Registration failed - limit exceeded");
  }
  query=`SELECT EXISTS (SELECT 1 FROM teaches WHERE year=${yr} and semester='${sem}' and course_id = '${courseid}' and sec_id = '${secid}') as ps;`;
  const resul = await pool.query(query);
  if(!resul.rows[0].ps){
    return res.write("Registration failed - no such course and section");
  }
  query=`SELECT prereq_id as p FROM prereq WHERE course_id = '${courseid}' and prereq_id not in (select course_id from takes where grade is not null and grade != 'F' and ID='${req.userId}');`;
  const re = await pool.query(query);
  let pqs=[];
  if(re.rows.length!=0){
  for (let i = 0; i < re.rows.length; i++) {
    pqs.push(re.rows[i].p);
  }
  res.write("Registration failed - prereq incomplete:");
  for (let i = 0; i < re.rows.length; i++) {
    res.write(pqs[i]);
  }

  }
  else {
    await pool.query("SELECT pg_sleep(30)");
    let query=`INSERT INTO takes (ID, course_id, sec_id, semester, year ) VALUES ('${req.userId}', '${courseid}', '${secid}', '${sem}', ${yr});`;
    const r = await pool.query(query);
    res.write("Course registration successful");
  }

});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
