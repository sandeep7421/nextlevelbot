module.exports = {
  development: {
    host: env("MYSQL_HOSTNAME", "localhost"),
    database: env("MYSQL_DATABASE", ""),
    username: env("MYSQL_USERNAME", ""),
    password: env("MYSQL_PASSWORD", ""),
    port: env("MYSQL_PORT", "3306"),
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true
    }
  },
  production: {
    host: env("MYSQL_HOSTNAME", "localhost"),
    database: env("MYSQL_DATABASE", ""),
    username: env("MYSQL_USERNAME", ""),
    password: env("MYSQL_PASSWORD", ""),
    port: env("MYSQL_PORT", "3306"),
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true
    }
  }
};

