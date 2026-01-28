# GroupProject
Group project for Abdul Razim, Edrick Hong, Mohammed Zakriah Ibrahim and Yuqi Liu

# Runbook
## MongoDB Docker:
### Create
```
docker run -d --name groupproject-mongo `
  -p 27017:27017 `
  -v groupproject_mongo_data:/data/db `
  mongo:6
```
### Status
```
docker ps | findstr groupproject-mongo
```
### Run
```
docker start groupproject-mongo
```
### Stop
```
docker stop groupproject-mongo
```

### Get in
```
docker exec -it groupproject-mongo mongosh
```

### Check data
```
use postreply_db
show collections
db.init.find().pretty()

use message_db
db.init.find().pretty()
```

## MySQL(local):
### Create History
```SQL
-- =========================
-- 0) Sanity checks (current session identity)
-- =========================
SELECT USER(), CURRENT_USER();

SHOW DATABASES;

-- =========================
-- 1) Drop DB first (in case it exists)
-- =========================
DROP DATABASE IF EXISTS history_db;

SHOW DATABASES;

-- =========================
-- 2) Inspect mysql users
-- =========================
SELECT user, host FROM mysql.user;

-- =========================
-- 3) Drop user (local only)
-- =========================
DROP USER IF EXISTS 'history_user'@'localhost';

SELECT user, host FROM mysql.user;

FLUSH PRIVILEGES;

-- =========================
-- 4) Create DB
-- =========================
CREATE DATABASE history_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW DATABASES;

-- =========================
-- 5) Create user
-- =========================
CREATE USER 'history_user'@'localhost'
IDENTIFIED WITH mysql_native_password
BY 'history_password';

SELECT user, host FROM mysql.user;

-- =========================
-- 6) Grant privileges
-- =========================
GRANT ALL PRIVILEGES ON history_db.*
TO 'history_user'@'localhost';

FLUSH PRIVILEGES;

-- Verify plugin/auth method
SELECT user, host, plugin
FROM mysql.user
WHERE user = 'history_user';

-- =========================
-- 7) Create table (matches requirement)
-- History(historyId, userId, postId, viewDate)
-- =========================
USE history_db;

DROP TABLE IF EXISTS `history_db`.`history`;

CREATE TABLE `history_db`.`history` (
  historyId BIGINT AUTO_INCREMENT PRIMARY KEY,
  userId    VARCHAR(64) NOT NULL,
  postId    VARCHAR(64) NOT NULL,
  viewDate  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_history_user_viewDate (userId, viewDate),
  INDEX idx_history_postId (postId)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

SHOW INDEX FROM `history_db`.`history`;
DESCRIBE `history_db`.`history`;

-- =========================
-- 8) Final sanity check identity
-- =========================
SELECT DATABASE() AS current_db;
SELECT USER(), CURRENT_USER();
```

### Create User
```SQL
-- =========================
-- 0) Sanity checks (current session identity)
-- =========================
SELECT USER(), CURRENT_USER();

SHOW DATABASES;

-- =========================
-- 1) Drop DB first (in case it exists)
-- =========================
DROP DATABASE IF EXISTS forum_user_service;

SHOW DATABASES;

-- =========================
-- 2) Inspect mysql users
-- =========================
SELECT user, host FROM mysql.user;

-- =========================
-- 3) Drop user (local only)
-- =========================
DROP USER IF EXISTS 'user_service_user'@'localhost';

SELECT user, host FROM mysql.user;

FLUSH PRIVILEGES;

-- =========================
-- 4) Create DB
-- =========================
CREATE DATABASE forum_user_service
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW DATABASES;

-- =========================
-- 5) Create user
-- =========================
CREATE USER 'user_service_user'@'localhost'
IDENTIFIED WITH mysql_native_password
BY 'user_service_password';

SELECT user, host FROM mysql.user;

-- =========================
-- 6) Grant privileges
-- =========================
GRANT ALL PRIVILEGES ON forum_user_service.*
TO 'user_service_user'@'localhost';

FLUSH PRIVILEGES;

-- Verify plugin/auth method
SELECT user, host, plugin
FROM mysql.user
WHERE user = 'user_service_user';

-- =========================
-- 7) Create table (users)
-- =========================
USE forum_user_service;

DROP TABLE IF EXISTS `forum_user_service`.`users`;

CREATE TABLE `forum_user_service`.`users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `joinDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email` VARCHAR(255) NOT NULL,
  `type` ENUM('user','admin','super') NOT NULL DEFAULT 'user',
  `status` ENUM('active','banned','unverified') NOT NULL DEFAULT 'unverified',
  `passHash` VARCHAR(255) NOT NULL,
  `profileS3Key` VARCHAR(1024) NOT NULL
    DEFAULT 'users/2/avatar/204351e0-3360-4a61-a15b-48aa9899b3c1_test.jpg',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

SHOW INDEX FROM `forum_user_service`.`users`;
DESCRIBE `forum_user_service`.`users`;

-- =========================
-- 8) Final sanity check identity
-- =========================
SELECT DATABASE() AS current_db;
SELECT USER(), CURRENT_USER();
```

## User Service (5001)
### In root terminal
```
python -m forum-user-service.src.main
```

## Post and Reply Service (5004)
```
mongodb://localhost:27017/postreply_db
```
<!-- ### test:
PowerShell:
node -e "console.log(require('jsonwebtoken').sign({ id: 1, type: 'user', status: 'active', iss: 'forum_user_service' }, process.env.JWT_SECRET || 'jwt_secret'))"

secret: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidHlwZSI6InVzZXIiLCJzdGF0dXMiOiJhY3RpdmUiLCJpc3MiOiJmb3J1bV91c2VyX3NlcnZpY2UiLCJpYXQiOjE3Njk0NzMzODh9.CNkxMiXvflcb9iRLL1H8V49LkoB7Ii62FHbNXDiVRXc

bash:
curl -i \
  -H "Authorization: Bearer <JWT>" \
  http://localhost:8080/api/posts

FE:
localStorage.setItem('token', 'token_generated')
location.reload() -->



## History Service (5003)
```
python wsgi.py
```

## Message service (5002)
```
Copy env, set port to 5002
npm run dev
```

## File Service (5005)
```
Copy env, set port to 5005
npm run dev`
```

## Email Service
### Run seperately
```
python src/main.py verification
python src/main.py contact
```

## Gateway (8080)
### In Repo Terminal
```
docker build -t forum-gateway:latest .
docker run -p 8080:8080 --env-file .env forum-gateway:latest
```

## Frontend (Vite dev server)
### Run without mocking
```
npm i
$env:VITE_USE_MOCK="false"; npm run dev
```



.\.venv\Scripts\Activate.ps1