
let pipeline = require('./pipeline');
let download = require('./step-download');
let resize   = require('./step-resize');

module.exports.handler = pipeline('ssc-processing', router);


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

  return null;
}
