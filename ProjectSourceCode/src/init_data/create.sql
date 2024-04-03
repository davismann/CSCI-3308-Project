CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  height CHAR(3),
  weight VARCHAR(4),
  activity_level VARCHAR(20),
  weight_goal VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS tracker (
    track_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    protein VARCHAR(5) NOT NULL,
    fats VARCHAR(5) NOT NULL,
    total_cals VARCHAR(5) NOT NULL,
    dietary_fibers VARCHAR(5) NOT NULL,
    carbohydrates VARCHAR(5) NOT NULL,
    goal_calories VARCHAR(5) NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username)
);
