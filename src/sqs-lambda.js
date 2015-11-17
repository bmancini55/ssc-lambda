
let AWS        = require('aws-sdk');
let config     = require('./config');
let queueUrl   = config.aws.queueUrl;
let lambdaName = config.aws.lambdaName;
let sqs        = new AWS.SQS(config.aws);
let lambda     = new AWS.Lambda(config.aws);

function run() {
  sqs.receiveMessage({ QueueUrl: queueUrl, MaxNumberOfMessages: 10 }, (err, data) => {
    if(err) {
      console.log('Error %j', err);
    } else {
      console.log('Processing: %j', data);
      if(data.Messages) {
        data.Messages.forEach(processMessage);
      }
    }
    run();
  });
}

function processMessage(message) {
  lambda.invoke({
    FunctionName: lambdaName,
    Payload: JSON.stringify(message)
  }, (err) => {
    if(err) console.log(err);
  });
}

run();
