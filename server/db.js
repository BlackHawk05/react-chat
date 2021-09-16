import mysql from 'mysql-await'
//import mysql from 'mysql2'

// create the connection to database
const db = mysql.createPool({
  host: process.env.REACT_APP_DB_HOST,
  user: process.env.REACT_APP_DB_USER,
  password: process.env.REACT_APP_DB_PASSWORD,
  database: process.env.REACT_APP_DB_DATABASE
})

export default db