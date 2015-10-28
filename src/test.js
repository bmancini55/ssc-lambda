
let AWS = require('aws-sdk');
let config = require('./config');
let authenticate = require('./helper-auth-jar');
let download = require('./download');

async function exex() {
  AWS.config.update(config.aws);

  download.handler({ stock_no: 'STK691703', s3Bucket: config.aws.s3Bucket });

}

exex();
