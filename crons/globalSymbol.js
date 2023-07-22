require("../bin/kernel");
const cron = require('node-cron');
let Sequelize = require("sequelize");
let { GlobalSymbol } = require("../app/Models");
const fs = require('fs');
const csvParser = require('csv-parser');
const { Op } = require("sequelize")

const filePath = '/var/www/data.csv';

const importGlobalSymbolCSV = async () => {
  const oneDayBeforeDate = new Date();
  oneDayBeforeDate.setDate(oneDayBeforeDate.getDate() - 1);

  return new Promise((resolve, reject) => {
    try {
      const fileStream = fs.createReadStream(filePath);
      const data = [];

      fileStream
        .pipe(csvParser())
        .on('data', (row) => {
          const convertedRow = {
            ...row,
            expiry: row.expiry ? new Date(row.expiry) : null,
          };
          data.push(convertedRow);
        })
        .on('end', async () => {
          try {
            // Insert all rows into the database
            await GlobalSymbol.bulkCreate(data);
            console.log('Global symbol csv import successful.');

            resolve('Global symbol csv imported.');
          } catch (error) {
            reject(`Error inserting global symbol data: ${error.message}`);
          }
        })
        .on('error', (error) => {
          // Handle errors during global symbol csv parsing
          reject(`Error parsing global symbol csv: ${error.message}`);
        });
    } catch (error) {
      // Handle errors during file reading or any other error
      console.error(`Error importing global symbol csv: ${error.message}`);
      reject(`Error importing global symbol csv: ${error.message}`);
    }
  });
};

const deleteOldData = () => {
  const oneDayBeforeDate = new Date();
  oneDayBeforeDate.setDate(oneDayBeforeDate.getDate() - 1);

  return new Promise((resolve, reject) => {
    GlobalSymbol.destroy({
      where: {
        createdAt: {
          [Op.lt]: oneDayBeforeDate,
        },
      },
    })
      .then((deletedCount) => {
        console.log(`${deletedCount} records deleted.`);
        resolve(`${deletedCount} global symbol records deleted.`);
      })
      .catch((error) => {
        console.error(`Error deleting records: ${error.message}`);
        reject(`Error deleting global symbol records: ${error.message}`);
      });
  });
};

console.log('Running global symbol cron job...');
importGlobalSymbolCSV()
  .then(() => deleteOldData())
  .then((result) => console.log(result))
  .catch((error) => console.error('An error occurred:', error));




