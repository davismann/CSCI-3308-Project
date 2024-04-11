CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  height CHAR(3),
  weight VARCHAR(4),
  age CHAR(3),
  activity_level VARCHAR(20),
  weight_goal VARCHAR(20),
  calorie_requirement VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS goals (
  id NUMERIC PRIMARY KEY,
  calories NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meals (
  id NUMERIC PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  calories NUMERIC NOT NULL,
  goal_id INT NOT NULL REFERENCES goals(id)
);