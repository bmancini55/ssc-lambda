
let pipeline = require('./pipeline');
let download  = require('./step-download');

module.exports.handler = pipeline('ssc-processing', router);


async function router(record) {

  if(!record.hasRaw) {
    return await download(record);
  }

  return null;
}
