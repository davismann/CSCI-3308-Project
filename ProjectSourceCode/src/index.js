const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layout',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });


// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);


  ////////
  app.get('/', (req, res) => {
    res.redirect('/login');
  });

  ////////
  app.get('/login', (req, res) => {
    res.render('pages/login');
  });
  
  ////////
  app.get('/register', (req, res) => {
    res.render('pages/register');
  });

  ///////
  app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const insertQuery = await db.result('INSERT INTO users(username, password) VALUES($1, $2);', [req.body.username, hashedPassword]);
      
        if (insertQuery) {
            res.redirect('/login');
        } else {
            res.render('pages/register');
        }
        } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user. Please try again later.');
        }
  });

///////
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user from the users table by username
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);

    // Check if user exists
    if (user) 
    {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = user;
        req.session.save();
        res.redirect('/home');
      } 
      else {
        res.render('pages/login', { error: 'Incorrect username or password.' });
      }
    } 
    else {
      res.redirect('/register');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.render('pages/login', { error: 'An error occurred. Please try again later.' });
  }
});

///////
const auth = (req, res, next) => {
    if (!req.session.user) {
    return res.redirect('/login');
    }
    next();
};
app.use(auth);

///////
app.get('/home', (req, res) => {
  // Render home.hbs without fetching any external data
  res.render('pages/home', {
    username: req.session.user.username,
    height: req.session.user.height,
    weight: req.session.user.weight,
    age: req.session.user.age,
    activity_level: req.session.user.activity_level,
    weight_goal: req.session.user.weight_goal
  });
});

  
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');