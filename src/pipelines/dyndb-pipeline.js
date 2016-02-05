/**
 * Processing pipeline using DynamoDB records.  DynamoDB supports
 * execution of Lambda functions upon state changes to DynamoDB records.
 *
 *
 * 1) extract the record from the event data
 * 2) process the record via the supplied function router
 * 3) updates the record in DynamoDB
 */

const AWS = require('aws-sdk');

module.exports = function(pipelineName, router) {

   return (event, context) => handler(event, context).catch(context.fail);

   async function handler(event, context) {
    console.log(JSON.stringify(event, null, 2));

    for(const record of event.Records) {
      if(record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        await process(record);
      }
    }
    context.succeed();
  }

  async function process(eventRecord) {
    let id = eventRecord.dynamodb.Keys.id.S;

    // get the record
    let record = eventRecord.dynamodb.NewImage ?
      JSON.parse(eventRecord.dynamodb.NewImage.json.S) :
      await getRecord(id);
    console.log('Start: %j', record);

    // route the call to the appropriate
    const recordAfter = await router(record);
    console.log('After: %j', recordAfter);

    // update the record
    if(recordAfter)
      await updateRecord(id, recordAfter);
  }


  function getRecord(id) {
    return new Promise((resolve, reject) => {
      const db = new AWS.DynamoDB();
      const params = {
        TableName: pipelineName,
        Key: { id: { 'S': id.toString() } }
      };
      db.getItem(params, function(err, item) {
        if(err) reject(err);
        else {
            var record = JSON.parse(item.Item.json.S);
            resolve(record);
        }
      });
    });
  }

  function updateRecord(id, record) {
    return new Promise((resolve, reject) => {
      const db = new AWS.DynamoDB();
      const params = {
        TableName: pipelineName,
        Key: { id: { 'S': id.toString() } },
        AttributeUpdates: {
          json: {
              Action: 'PUT',
              Value: {
                'S': JSON.stringify(record)
              }
          }
        }
      };
      db.updateItem(params, (err, data) => {
        if(err) reject(err);
        else resolve(data);
      });
    });
  }

};




