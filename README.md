# nextlevelbot
# to run cron 
    use below command 
    node crons/globalSymbol.js

# schema for global_symbols table
 CREATE TABLE `global_symbols` (
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
