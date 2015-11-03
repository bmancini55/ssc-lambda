
let AWS          = require('aws-sdk');
let config       = require('./config');
let download     = require('./step-download');
let resize       = require('./step-resize');

async function exex() {
  AWS.config.update(config.aws);

  //download.handler({ stock_no: 'STK691703', s3Bucket: config.aws.s3Bucket });

  await resize({ stock_no: 'STK678055' }, 100);

}

exex().catch(console.log);
