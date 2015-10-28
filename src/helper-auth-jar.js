
let Bluebird = require('bluebird');
let AWS = require('aws-sdk');
let CookieJar = require('tough-cookie').CookieJar;

module.exports = getAuthCache;

async function getAuthCache() {
  let db = Bluebird.promisifyAll(new AWS.DynamoDB());

  let result = await db.getItemAsync({
    TableName: 'ssc-image-processing',
    Key: { stock_no: { 'S': 'auth' }}
  });

  let serializedJar = JSON.parse(result.Item.jar.S);
  let jar = CookieJar.deserializeSync(serializedJar);
  return jar;
}
