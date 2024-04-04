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

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

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

  app.get('/', (req, res) => {
    res.redirect('/login');
  });
  app.get('/login', (req, res) => {
    res.render('pages/login');
  });
  app.get('/register', (req, res) => {
    res.render('pages/register');
  });

  app.post('/register', async (req, res) => {
    try {
      // Destructure the required fields from the request body
      const { username, password, height, weight, activity_level, weight_goal, age, gender } = req.body;
      
      // Parse numeric fields from strings to numbers
      const weightInKg = parseFloat(weight); 
      const heightInCm = parseFloat(height); 
      const ageYears = parseInt(age, 10);
      
      // BMR Calculation based on gender
      const bmr = gender === 'male'
        ? 10 * weightInKg + 6.25 * heightInCm - 5 * ageYears + 5
        : 10 * weightInKg + 6.25 * heightInCm - 5 * ageYears - 161;
      
      // Adjust BMR based on activity level for TDEE calculation
      const activityFactors = {
        'Never': 1.2,
        '1-2 times a week': 1.375,
        '3-4 times a week': 1.55,
        '5-7 times a week': 1.725
      };
      let tdee = bmr * (activityFactors[activity_level] || 1.2);
      
      // Adjust TDEE based on weight goal
      if (weight_goal === 'Lose Weight') {
        tdee -= 500;
      } else if (weight_goal === 'Bulk') {
        tdee += 500;
      }
      // No adjustment needed for 'Maintain'
      
      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      let calorie_requirement = Math.round(tdee);
      
      // Insert the new user into the database with the calorie goal
      const insertUserQuery = `
        INSERT INTO users(username, password, height, weight, age, activity_level, weight_goal, calorie_requirement) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8);
      `;
      const insertUser = await db.result(insertUserQuery, 
        [username, hashedPassword, heightInCm, weightInKg, ageYears, activity_level, weight_goal, calorie_requirement]
      );
      
      // Check if the user was successfully inserted
      if (insertUser.rowCount > 0) {
        // Set the session user if needed and redirect to login
        // ... (session logic here if applicable) ...
        res.redirect('/login');
      } else {
        // If insertion failed, render the registration page again with an error message
        res.render('pages/register', { error: 'Failed to register user.' });
      }
    } catch (error) {
      // Log and send the error
      console.error('Error registering user:', error);
      res.status(500).send('Error registering user. Please try again later.');
    }
  });
  
  
  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Find the user from the users table by username
      const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
      // Check if user exists
      if (user) {
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
          // If credentials match, set the session user with the user's information
          req.session.user = {
            username: user.username,
            height: user.height,
            weight: user.weight,
            age: user.age,
            activity_level: user.activity_level,
            weight_goal: user.weight_goal,
            calorie_requirement: user.calorie_requirement
          };
          req.session.save(); // Save the session
          res.redirect('/home');
        } else {
          res.status(400).render('pages/login', { error: 'Incorrect username or password.' });
        }
      } else {
        // res.status(400).render('pages/register');
        res.redirect('/register');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(400).render('pages/login', { error: 'An error occurred. Please try again later.' });
    }
  });


app.get('/home', auth, (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    height: req.session.user.height,
    weight: req.session.user.weight,
    age: req.session.user.age,
    activity_level: req.session.user.activity_level,
    weight_goal: req.session.user.weight_goal,
    calorie_requirement: req.session.user.calorie_requirement
  });
});

app.get('/logout', auth, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).send('Error logging out');
    } else {

      res.render('pages/logout');
    }
  });
});

app.get('/tracker', auth, async (req, res) => {
  const username = req.session.user.username;

  try {
      const user = await db.one('SELECT calorie_requirement FROM users WHERE username = $1', username);

      res.render('pages/tracker', {

          calorie_requirement: user.calorie_requirement
      });
  } catch (error) {
      console.error('Error fetching calorie requirement:', error);

      res.status(500).send('An error occurred while fetching the calorie requirement.');
  }
});

//DUMMY APIS FOR TESTING//

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.get('/dummy-positive-test', (req, res) => {
  res.status(200).json({ result: 15 });
});

app.get('/dummy-negative-test', (req, res) => {
  res.status(200).json({ result: 5 }); 
});


  
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');


