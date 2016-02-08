# ssc-lambda
The goal of this project was to build a state-machine processing pipeline using AWS Lambda and SQS. Infrastructure was created so that an author using the pipeline would only have to write two pieces of logic:

1. A routing function to route a record (based on its state) to the appropriate mutation function
2. A mutation function that performs a mutation operation and updates the record to its new state

A simple example looks like this:

```
let pipeline = require('../pipelines/sqs-pipeline');
let deepcopy = require('deepcopy');
module.exports = pipeline('my-sqs-queue-url', router);

// routing function checks the state and then
// calls a mutation function that passes back the new state record
function router(record) {

  if(!record.greeting) {
    return createGreeting(record)
  }

  if(!record.name) {
    return createName(record);
  }

  return null;
}

// pure mutation function to add a greeting property to the record
function createGreeting(record) {
  let result = deepcopy(record);
  result.greeting = 'hello';
  return result;
}

// pure mutation function to add a name property to the record
function createName(record) {
  let result = deepcopy(record);
  result.name = 'world';
  return result;
}

```

These pieces are glued together by a processing pipeline that interacts with AWS Lambda and SQS. The messages passed to Lambda from SQS look like this:

```
{
    "MessageId": "4bdfcaa4-41ef-450c-ac59-945b09d0a53c",
    "ReceiptHandle": "AQEB0tLZJxw9SUSe1QmyV/EN8meHdsPioZlKHPtEg7OJlM2jsGKrEEU2G2zHMz5D9k5I0QmibOTUBs4w5s9VZCB9mEBYW1Bxt0wAvHvrcz03fAVbACf+/9Q6QhArga/etc7584OTQu8vvFfMbf1yaYxiyY0WXveoQxWmT2XBNLlIcX0WS3vlxhMwvUU7oEfTLF6CFKKoV4gtOXOvGrobeguoWBb5JNKZi4zSaCQaf84+fi6S7c9kZfGYTCGG9sz86Zln9GmcrZgVTi3/2EkCjLoHsl3vIekX5N2+g8nJinLwOjm+bdq28OmAZ9gZtA9q9+bE2HPmem2R/EGDRANFvhhRbw==",
    "MD5OfBody": "1d66c20ecd0979525d5ea75f9448dbe1",
    "Body": "{\"stock_no\":\"STK650149\",\"hasRaw\":true}"
}
``` 

The pipeline acts as the handler for AWS Lambda functions. It converts the the SQS message into a state record that can be easily consumed by the routing function and mutated. 

The pipeline performs the following functions:

1. Plucks the state record inside the Body property of the SQS message that is supplied to the Lambda method
2. Executes the routing function
3. Enqueues a new state record into SQS
4. Deletes the current message from SQS so that it does not get picked up for processing again

With each pass of the lambda function the state will mutate to indicate where in the pipeline the record is. When the record is completed processing, the router should return null.  At this point the pipeline will no longer enqueue another record.

A series of state records would look like this:
```
// initial push into
{ "stock_no": "STK675849" }

// after downloading raw image
{ "stock_no": "STK675849", "has_raw": true },

// after creating first thumbnail
{ "stock_no": "STK675849", "has_raw": true, "size_100": true}

// after creating second thumbnail
{ "stock_no": "STK675849", "has_raw": true, "size_100": true, "size_200": true }
```

To make all this work there are a few additional pieces. At the time this was created, SQS could not trigger Lambda functions directly. As a result a few pieces are needed external to SQS and Lambda.

1. A producer pushes initial events into an SQS queue. The event body contains a record of state.
2. An agent watches the SQS and for each event it calls a Lambda function and passes the event information.

I usually start the agent, on my local machine, then I run the producer to generate the initial state.

## AWS Setup

#### SQS Configuration

Open SQS and create a new queue. Configure the name. Configure the Default Visibility Timeout to 1 minute.  This setting controls how long messages will stay hidden once pulled from the queue.  If they are not deleted in the timeout period, they reenter the queue for pickup.  This timeout value should correspond to the Lambda Timeout value we'll configure later.

Add full permissions to the SQS queue to your user account.

#### S3 Configuration

Create a bucket to store the processed images.

#### Lambda Configuration

First you will need to create a new IAM Role for your Lambda to execute under.  This policy will grant access to the logging mechanism. It will also grant access to your S3 bucket from the Lambda. For the Role, create a policy that has the following information in it. Note: Change the bucket name "my-bucket" to the name of the bucket you just created.

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets"
      ],
      "Resource": [
        "arn:aws:s3:::*"
      ]
    }
  ]
}
```

Finally, you will need to configure your Lambda.

* Skip using a blueprint
* Name your Lambda something approciate
* Set the runtime to Node.js
* Leave the code blank or add the bare minimum to get it to save (we'll deploy our code later)
* Set the handler path to `dist/lambda/handler.handler`.  This corresponds to the `dist/lambda` folder (the transpiled version of the source) and the handler function inside of handler.js.
* Set the role to your newly created Role
* Set the memory required to 128MB
* Set the timeout to 1 minute


You should be all setup now!

## Configure the Code:

First clone the repo from Github
```
git clone https://github.com/bmancini/ssc-lambda
```

Next install the dependencies
```
npm install
```

Next you will need to copy the example configuration file
```
cp config.example.js config.js
```
Edit the new config.js fill it in with valid AWS credentials. Enter the AWS access keys, the S3 target bucket where the images will be placed, the URL of the SQS queue that you created above.

You will also need Diamond Comic Distributor credentials. Contact me directly for that (note, I may change this example to work off a generic image set).


Publish the code to the Lambda function:
```
npm run publish
```


Start the agent:
```
npm run agent
```

Push some records onto the queue:
```
npm run produce
```

At this point the agent should be pickuping up data every few seconds as the queue is flushed.  You can further monitor the progress by accessing the CloudWatch Logs.

That's all there is to it!
