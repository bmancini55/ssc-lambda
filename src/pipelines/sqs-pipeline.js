/**
 * Processing pipeline using SQS. SQS does not support pushing
 * lambda functions and requires an Agent that will call the lambda
 * functions when there is an event in the pipeline.
 *
 * This pipline will do the following:
 * 1) extract the record from the event data
 * 2) process the record via the supplied function router
 * 3) enqueue the mutated record back into SQS
 * 4) delete the current event from the SQS to indicate success
 */

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

module.exports = function(pipelineName, router) {

   return (event, context) => handler(event, context)
   .catch(() => {
      handleError(event);
      context.fail();
    });

   // {
   //   "MessageId":"4cba8f82-25b8-4eb5-ba9a-7d6f4ff8d6d7",
   //   "ReceiptHandle":"AQEBcGf2gSOrjzs0jN1yRz0D3zKDqI9wUMzAyUnQbgPi8ZabWUfsUTJSOIzmDb4563ShcuhZXWj4Zhj1ADJ9gij7XqDSgkqrr6GRfqN6QsgQ+L05WSC64CIX2jmPNTHq+/qMRaq5Ze2ayQ2Q3TWr2WoU7KQkwqyWt86yu8/oxT0pnQt/+GfrMfTdF4IIsPkyAF9wRzFQvIvPMZzRxE1mQN9XmueAFQpfCLFDaAB6L4NKa9NM8qgLpSMbQpqdkicRNwk3/2EwIeeDYvFcSNz3WmrStKJUz8Szes3QT3TDaKikq10ALo9YV4J/10Kh5NMEMlMaDLHxaMdNgNrR9coDZP31eA==",
   //   "MD5OfBody":"952d2c56d0485958336747bcdd98590d",
   //   "Body":"{}"
   // }
   async function handler(event, context) {
    console.log(JSON.stringify(event, null, 2));

    // get the record from the event
    let record = getRecord(event);

    // do processing with record
    let postRecord = await processRecord(record);

    // queue next stage
    await enqueueRecord(postRecord);

    // delete from queue
    await deleteEvent(event);

    context.succeed();
  }

  function getRecord(event) {
    if(event.Body) {
      return JSON.parse(event.Body);
    }
  }

  async function processRecord(record) {
    console.log('Before: %j', record);
    let postRecord = await router(record);
    console.log('After: %j', postRecord);
    return postRecord;
  }

  function enqueueRecord(record) {
    if(record) {
      let body = JSON.stringify(record);
      return new Promise((resolve, reject) => {
        sqs.sendMessage({ QueueUrl: pipelineName, MessageBody: body }, (err) => {
          if(err) reject(err);
          else    resolve();
        });
      });
    }
  }

  function deleteEvent(event) {
    return new Promise((resolve, reject) => {
      sqs.deleteMessage({ QueueUrl: pipelineName, ReceiptHandle: event.ReceiptHandle }, (err) => {
        if(err) reject(err);
        else    resolve();
      });
    });
  }

  function handleError(event) {
    // get the record from the event
    let record = getRecord(event);

    // queue next stage
    enqueueRecord(record);
  }

};




