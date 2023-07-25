# nextlevelbot
# to run cron 
    use below command 
    node crons/Upstoxv2.js

# schema for Upstoxv2 table
 CREATE TABLE `Upstoxv2` (
  `id` int NOT NULL AUTO_INCREMENT,
  `instrument_key` varchar(100) DEFAULT NULL,
  `exchange_token` varchar(100) DEFAULT NULL,
  `tradingsymbol` varchar(45) DEFAULT NULL,
  `name` varchar(45) DEFAULT NULL,
  `last_price` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expiry` date DEFAULT NULL,
  `strike` varchar(45) DEFAULT NULL,
  `tick_size` varchar(45) DEFAULT NULL,
  `lot_size` varchar(45) DEFAULT NULL,
  `instrument_type` varchar(45) DEFAULT NULL,
  `option_type` varchar(45) DEFAULT NULL,
  `exchange` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

# curls
    Register
        curl --location 'localhost:3000/api/v1/register' \
        --header 'Content-Type: application/json' \
        --data-raw '{
        "name":"test sssssname",
        "email":"test@gmail.com",
        "phone":"9653770199",
        "password":"12345678"
        }'
    Login 
        curl --location 'localhost:3000/api/v1/login' \
        --header 'Content-Type: application/json' \
        --data-raw '{
        "email":"test123366@gmail.com",
        "password":"12345678"
        }'
    Me (LoginedIn user )
        curl --location 'localhost:3000/api/v1/me' \
        --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNlc3Npb25fdG9rZW4iOiIxNTlhY2E2MDM3MmI3NTQwYmI0Y2VhNjAxM2FhODYzZjFkMjA3MGZiOGJlOTI3NDYxZGE2ZWQxODY1MjgzNjVlIn0sImlhdCI6MTY5MDI4NTc2Mn0.Nt2M2r6dWW3xpnpHRbWDI7vWvV5LSD1i1nrlcnVHOzo'