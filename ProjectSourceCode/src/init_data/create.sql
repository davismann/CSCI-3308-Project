DROP TABLE IF EXISTS user CASCADE;
CREATE TABLE IF NOT EXISTS user (
  user_id SERIAL PRIMARY KEY NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  height CHAR(3) NOT NULL,
  weight VARCHAR(4) NOT NULL,
  activity_level ENUM('Never', '1-2 times a week', '3-4 times a week', '5-7 times a week'),
  weight_goal ENUM('Lose Weight', 'Bulk', 'Maintain')
);