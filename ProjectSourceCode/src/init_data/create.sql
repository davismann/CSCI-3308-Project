CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  height CHAR(3),
  weight VARCHAR(4),
  age CHAR(3),
  gender VARCHAR(20),
  activity_level VARCHAR(20),
  weight_goal VARCHAR(20),
  calorie_requirement INT,
  daily_calorie_requirement INT
);

CREATE TABLE IF NOT EXISTS goals (
  goal_id NUMERIC PRIMARY KEY,
  calories INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  username VARCHAR(50) NOT NULL REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  calories INT,
  goal_id NUMERIC NOT NULL REFERENCES goals(goal_id),
  username VARCHAR(50) NOT NULL REFERENCES users(username),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);