
let pipeline = require('../pipelines/sqs-pipeline');
let download = require('./step-download');
let resize   = require('./step-resize');
let config   = require('../config');
let queueUrl = config.aws.queueUrl;


module.exports.handler = pipeline(queueUrl, router);


async function router(record) {

  if(!record.hasRaw) {
    return await download(record);
  }

  if(!record.size_100) {
    return await resize(record, 100);
  }

  if(!record.size_200) {
    return await resize(record, 200);
  }

  if(!record.size_300) {
    return await resize(record, 300);
  }

  if(!record.size_400) {
    return await resize(record, 400);
  }

  return null;
}
