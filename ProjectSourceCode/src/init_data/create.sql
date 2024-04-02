CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  height CHAR(3),
  weight VARCHAR(4),
  activity_level VARCHAR(20),
  weight_goal VARCHAR(20)
);
