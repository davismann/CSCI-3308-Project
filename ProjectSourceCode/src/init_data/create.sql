CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  height CHAR(3) NOT NULL,
  weight VARCHAR(4) NOT NULL,
  activity_level ENUM('Never', '1-2 times a week', '3-4 times a week', '5-7 times a week'),
  weight_goal ENUM('Lose Weight', 'Bulk', 'Maintain')
);