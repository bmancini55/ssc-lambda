
let pipeline = require('./sqs-pipeline');
let download = require('./step-download');
let resize   = require('./step-resize');
let config   = require('./config');
let queueUrl = config.aws.queueUrl;


module.exports.handler = pipeline(queueUrl, router);


async function router(record) {

  if(!record.hasRaw) {
    return await download(record);
  }

  if(!record.size_100) {
    record = await resize(record, 100);
  }

  if(!record.size_200) {
    record = await resize(record, 200);
  }

  if(!record.size_300) {
    record = await resize(record, 300);
  }

  if(!record.size_400) {
    record = await resize(record, 400);
  }

  return null;
}
