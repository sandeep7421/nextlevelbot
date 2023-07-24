require("../bin/kernel");
const cron = require('node-cron');
let Sequelize = require("sequelize");
let { Upstoxv2 } = require("../app/Models");
const fs = require('fs');
const csvParser = require('csv-parser');
const { Op } = require("sequelize")

const filePath = '/var/www/data.csv';

const importUpstoxv2CSV = async () => {
  const oneDayBeforeDate = new Date();
  oneDayBeforeDate.setDate(oneDayBeforeDate.getDate() - 1);

  const batchSize = 1000; 

  return new Promise((resolve, reject) => {
    try {
      const fileStream = fs.createReadStream(filePath);
      const data = [];
      let batch = [];

      fileStream
        .pipe(csvParser())
        .on('data', (row) => {
          const convertedRow = {
            ...row,
            expiry: row.expiry ? new Date(row.expiry) : null,
          };
          batch.push(convertedRow);

        
          if (batch.length >= batchSize) {
            data.push(...batch);
            batch = [];
          }
        })
        .on('end', async () => {
          try {
            
            if (batch.length > 0) {
              data.push(...batch);
            }

            for (let i = 0; i < data.length; i += batchSize) {
              const batchData = data.slice(i, i + batchSize);
              await Upstoxv2.bulkCreate(batchData);
            }

            console.log('Upstoxv2 csv import successful.');
            resolve('Upstoxv2 csv imported.');
          } catch (error) {
            reject(`Error inserting Upstoxv2 data: ${error.message}`);
          }
        })
        .on('error', (error) => {
          // Handle errors during Upstoxv2 csv parsing
          reject(`Error parsing Upstoxv2 csv: ${error.message}`);
        });
    } catch (error) {
      // Handle errors during file reading or any other error
      console.error(`Error importing Upstoxv2 csv: ${error.message}`);
      reject(`Error importing Upstoxv2 csv: ${error.message}`);
    }
  });
};

const deleteOldData = () => {
  const oneDayBeforeDate = new Date();
  oneDayBeforeDate.setDate(oneDayBeforeDate.getDate() - 1);

  return new Promise((resolve, reject) => {
    Upstoxv2.destroy({
      where: {
        createdAt: {
          [Op.lt]: oneDayBeforeDate,
        },
      },
    })
      .then((deletedCount) => {
        console.log(`${deletedCount} records deleted.`);
        resolve(`${deletedCount} Upstoxv2 records deleted.`);
      })
      .catch((error) => {
        console.error(`Error deleting records: ${error.message}`);
        reject(`Error deleting Upstoxv2 records: ${error.message}`);
      });
  });
};

console.log('Running Upstoxv2 cron job...');
importUpstoxv2CSV()
  .then(() => deleteOldData())
  .then((result) => console.log(result))
  .catch((error) => console.error('An error occurred:', error));





