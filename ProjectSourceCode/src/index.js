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
    const { username, password, height, weight, activity_level, weight_goal, age, gender } = req.body;

    if (/^\d+$/.test(username)) {
      return res.status(400).send('Invalid username. Usernames cannot consist only of numbers.');
    }

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

    // Generate a new goal_id
    const goal_id = Math.floor(Math.random() * 1000000); // You can use a more robust method for generating IDs

    // Insert the new user into the database with the calorie goal
    const insertUserQuery = `
        INSERT INTO users(username, password, height, weight, age, gender, activity_level, weight_goal, calorie_requirement) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8 ,$9)
        RETURNING username;
      `;
    const newUser = await db.one(insertUserQuery,
      [username, hashedPassword, heightInCm, weightInKg, ageYears, gender, activity_level, weight_goal, calorie_requirement]
    );

    const insertGoalQuery = `INSERT INTO goals(goal_id, calories, username) VALUES($1, $2, $3);`;
    await db.none(insertGoalQuery, [goal_id, calorie_requirement, newUser.username]);
    res.redirect('/login');

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user. Please try again later.');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (/^\d+$/.test(username)) {
      return res.status(400).send('Invalid username. Usernames cannot consist only of numbers.');
    }
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);


    // Check if user exists
    if (user) {
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        // Set the session user with the user's info
        req.session.user = {
          username: user.username,
          height: user.height,
          weight: user.weight,
          age: user.age,
          gender: user.gender,
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
      res.redirect('/register');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(400).render('pages/login', { error: 'An error occurred. Please try again later.' });
  }
});

app.post('/addMeal', auth, async (req, res) => {
  try {
    const { mealName, mealCalories } = req.body;
    const username = req.session.user.username;

    const userGoalQuery = `SELECT goal_id FROM goals WHERE username = $1;`;
    const { goal_id } = await db.one(userGoalQuery, [username]);

    // Insert the meal into meals tb
    const insertMealQuery = `INSERT INTO meals(name, calories, goal_id, username) VALUES($1, $2, $3, $4)RETURNING *;`;
    const insertedMeal = await db.one(insertMealQuery, [mealName, mealCalories, goal_id, username]);

    // Update total calories for day in the users tb
    const updateCaloriesQuery = `UPDATE users SET daily_calorie_requirement = daily_calorie_requirement + $1 WHERE username = $2;`;
    await db.none(updateCaloriesQuery, [mealCalories, username]);

    res.redirect('/tracker');
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).send('Error adding meal. Please try again later.');
  }
});

app.post('/clearData', auth, async (req, res) => {
  const username = req.session.user.username;
  try {
    const deleteQuery = `DELETE FROM meals WHERE username = $1 AND DATE(created_at) = CURRENT_DATE;`;
    await db.none(deleteQuery, [username]);

    // Set daily_calorie_requirement 0
    const updateCaloriesQuery = `UPDATE users SET daily_calorie_requirement = 0 WHERE username = $1;`;
    await db.none(updateCaloriesQuery, [username]);

    res.redirect('/tracker');
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).send('An error occurred while clearing the data.');
  }
});

app.get('/home', auth, (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    height: req.session.user.height,
    weight: req.session.user.weight,
    age: req.session.user.age,
    gender: req.session.user.gender,
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
    const userCalorieQuery = `SELECT calorie_requirement, daily_calorie_requirement FROM users WHERE username = $1;`;
    const { calorie_requirement, daily_calorie_requirement } = await db.one(userCalorieQuery, [username]);

    // Get the meals to put them into the log
    const mealsQuery = `SELECT name, calories FROM meals WHERE username = $1AND DATE(created_at) = CURRENT_DATE;`;
    const meals = await db.manyOrNone(mealsQuery, [username]);

    // Get the sum of the calories from the meals because I cant seem to get the daily_calorie_requirement to work
    const totalCaloriesQuery = `SELECT SUM(calories) AS total_calories FROM meals WHERE username = $1 AND DATE(created_at) = CURRENT_DATE;`;
    const result = await db.one(totalCaloriesQuery, [username]);
    const { total_calories } = result;

    res.render('pages/tracker', {
      username: username,
      calorie_requirement: calorie_requirement,
      daily_calorie_requirement: daily_calorie_requirement,
      meals: meals || [],
      totalCalories: total_calories || 0,
      totalCaloriesExceedsGoal: total_calories > calorie_requirement,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error while get logs.');
  }
});

app.use(bodyParser.json());
app.use(express.static(__dirname));
let RECIPE_FILTERS = {};

app.post('/apply-filters', function (req, res) {
  RECIPE_FILTERS = req.body.filters;
  res.json({ message: 'Filters applied', filters: RECIPE_FILTERS });
});

app.get('/recipes', auth, async (req, res) => {

  const { nutrients, calories, q, mealType } = RECIPE_FILTERS;

  const params = {
    app_key: process.env.API_KEY,
    app_id: process.env.APP_ID,
    type: "public",
  };

  if (q) params.q = q;
  if (mealType) params.mealType = mealType;
  if (calories) params.calories = calories;

  if (nutrients) {
    if (nutrients.PROCNT) params['nutrients%5BPROCNT%5D'] = encodeURIComponent(nutrients.PROCNT);
    if (nutrients.CHOCDF) params['nutrients%5BCHOCDF%5D'] = encodeURIComponent(nutrients.CHOCDF);
    if (nutrients.FAT) params['nutrients%5BFAT%5D'] = encodeURIComponent(nutrients.FAT);
  }

  try {
    const response = await axios({
      url: `https://api.edamam.com/api/recipes/v2`,
      method: 'GET',
      dataType: 'json',
      headers: {
        'Accept': 'application/json',
      },
      params: params
    });


    if (response.data && response.data.hits) {
      let recipes = response.data.hits.map(hit => {
        let { recipe } = hit;
        return {
          label: recipe.label,
          image: recipe.image,
          url: recipe.url,
          ingredients: recipe.ingredientLines,
          calories: recipe.calories,
          cuisineType: recipe.cuisineType,
          mealType: recipe.mealType,
          dishType: recipe.dishType,
          nutrients: recipe.totalNutrients,
        };
      });


      let filteredRecipes = [];
      for (let i = 0; i < recipes.length; i++) {
        let recipe = recipes[i];
        let includeRecipe = true;

        // keyword filtering
        if (q && !recipe.label.toLowerCase().includes(q.toLowerCase())) {
          includeRecipe = false;
        }

        // calorie filtering
        if (calories) {
          let calRange;
          if (calories.includes('-')) {
            calRange = calories.split('-');
            const minCal = parseInt(calRange[0]);
            const maxCal = parseInt(calRange[1]);
            if (!(recipe.calories >= minCal && recipe.calories <= maxCal)) {
              includeRecipe = false;
            }
          }
          else if (calories.includes('+')) {
            calories = calories.replace('+', '');
            if (recipe.calories <= calories) {
              includeRecipe = false;
            }
          }
          else {
            if (recipe.calories >= calories) {
              includeRecipe = false;
            }
          }
        }

        // protein filtering
        if (nutrients.PROCNT) {
          let protein = nutrients.PROCNT;
          let proteinRange;
          let recipeProtein = recipe.nutrients.PROCNT.quantity;
          if (protein.includes('-')) {
            proteinRange = protein.split('-');
            const minProtein = parseInt(proteinRange[0]);
            const maxProtein = parseInt(proteinRange[1]);
            if (!(recipeProtein >= minProtein && recipeProtein <= maxProtein)) {
              includeRecipe = false;
            }
          }
          else if (protein.includes('+')) {
            protein = protein.replace('+', '');
            if (recipeProtein <= protein) {
              includeRecipe = false;
            }
          }
          else {
            if (recipeProtein >= protein) {
              includeRecipe = false;
            }
          }
        }

        // carb filtering
        if (nutrients.CHOCDF) {
          let carb = nutrients.CHOCDF;
          let carbRange;
          let recipeCarb = recipe.nutrients.CHOCDF.quantity;
          if (carb.includes('-')) {
            carbRange = carb.split('-');
            const minCarb = parseInt(carbRange[0]);
            const maxCarb = parseInt(carbRange[1]);
            if (!(recipeCarb >= minCarb && recipeCarb <= maxCarb)) {
              includeRecipe = false;
            }
          }
          else if (carb.includes('+')) {
            carb = carb.replace('+', '');
            if (recipeCarb <= carb) {
              includeRecipe = false;
            }
          }
          else {
            if (recipeCarb >= carb) {
              includeRecipe = false;
            }
          }
        }

        // fat filtering
        if (nutrients.FAT) {
          let fat = nutrients.FAT;
          let fatRange;
          let recipeFat = recipe.nutrients.FAT.quantity;
          if (fat.includes('-')) {
            fatRange = fat.split('-');
            const minFat = parseInt(fatRange[0]);
            const maxFat = parseInt(fatRange[1]);
            if (!(recipeFat >= minFat && recipeFat <= maxFat)) {
              includeRecipe = false;
            }
          }
          else if (fat.includes('+')) {
            fat = fat.replace('+', '');
            if (recipeFat <= fat) {
              includeRecipe = false;
            }
          }
          else {
            if (recipeFat >= fat) {
              includeRecipe = false;
            }
          }
        }

        if (includeRecipe) {
          filteredRecipes.push(recipe);
        }
      }

      for (let i = 0; i < filteredRecipes.length; i++) {
        let recipe =filteredRecipes[i];
        recipe.calories = recipe.calories.toFixed(2);
        recipe.nutrients.FAT.quantity = recipe.nutrients.FAT.quantity.toFixed(2);
        recipe.nutrients.CHOCDF.quantity = recipe.nutrients.CHOCDF.quantity.toFixed(2);
        recipe.nutrients.PROCNT.quantity = recipe.nutrients.PROCNT.quantity.toFixed(2);
      }
      console.log(params)
      res.render('pages/recipes', { recipes: filteredRecipes });
    } else {
      res.render('pages/recipes', { recipes: [], message: "No recipes found." });
    }
  } catch (error) {
    console.error("Error with Axios:", error);
    res.render('pages/recipes', {
      recipes: [],
      message: "Failed to fetch recipes. Please try again later."
    });
  }
});

//DUMMY APIS FOR TESTING//

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
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


