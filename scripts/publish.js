
let Bluebird = require('bluebird');
let AWS = require('aws-sdk');
let config = require('../config');
let lambda = new AWS.Lambda(config.aws);
let zipPath = require('path').resolve('./', 'lambda.zip');


async function exec() {
  console.log('Creating zip file ' + zipPath);
  let buffer = await zip();

  console.log('Updating function code');
  await update({ buffer });
  console.log('Updated successfully');

  console.log('Deleting zip file ' + zipPath);
  await removeZip();
}

// Execute code
exec().catch(console.log);



async function zip() {
  const exec = Bluebird.promisify(require('child_process').exec);
  const readFile = Bluebird.promisify(require('fs').readFile);
  let result = await exec(`zip -rq ./lambda.zip ./`);
  let buffer = await readFile(zipPath);
  return buffer;
}

async function update({ buffer }) {
  lambda.updateFunctionCodeAsync = Bluebird.promisify(lambda.updateFunctionCode);
  let result = await lambda.updateFunctionCodeAsync({
    FunctionName: config.aws.lambdaName,
    Publish: true,
    ZipFile: buffer
  });
  return result;
}

async function removeZip() {
  const unlink = Bluebird.promisify(require('fs').unlink);
  let result = await unlink(zipPath);
  return result;
}