CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  height CHAR(3) NOT NULL,
  weight VARCHAR(4) NOT NULL,
  activity_level VARCHAR(20) NOT NULL,
  weight_goal VARCHAR(20) NOT NULL
);