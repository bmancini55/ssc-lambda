
let Bluebird     = require('bluebird');
let path         = require('path');
let fs           = require('fs');
let AWS          = require('aws-sdk');
let request      = Bluebird.promisifyAll(require('request'));
let authenticate = require('./helper-auth-jar');


exports.handler = function(event, context) {
  handler(event, context)
  .catch((err) => {
    console.log(err);
    context.fail(err.stack || err.message || err);
  });
};


async function handler(event, context) {
  let { stock_no } = event;
  let { s3Bucket } = event;

  let filePath = 'test/items/' + stock_no + '.jpg';

  let jar    = await authenticate();
  console.log('Successfully authenticated');

  let buffer = await fetch({ stock_no, jar });
  console.log('Image buffer downloaded %d', buffer.length);

  let result = await upload({ filePath, buffer, s3Bucket });
  console.log('File has been uploaded to %s', filePath);

  context.succeed(result);
}


async function fetch({ stock_no, jar }) {
  return new Promise(function(resolve, reject) {

    let outdir      = '/tmp';
    let outfilepath = path.join(outdir, stock_no + '.jpg');
    let writestream = fs.createWriteStream(outfilepath);

    // make request
    let opts = {
      url: 'https://retailerservices.diamondcomics.com/Image/Resource/1/' + stock_no,
      jar: request.jar(jar.store),
      followRedirect: false,
      headers: {
        'UserAgent': 'Mozilla / 5.0(Windows NT 6.1; WOW64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 42.0.2311.135 Safari / 537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    };

    // pipe the response
    request
      .get(opts)
      .on('error', reject)
      .on('end', () => {
        fs.readFile(outfilepath, function(err, data) {
          if(err) reject(err);
          else resolve(data);
        });
      })
      .pipe(writestream);
  });
}



async function upload({ s3Bucket, filePath, buffer }) {
  let s3 = Bluebird.promisifyAll(new AWS.S3());
  return await s3.putObjectAsync({
    Bucket: s3Bucket,
    Key: filePath,
    ACL: 'public-read',
    Body: buffer,
    ContentType: 'image/jpg',
    ContentLength: buffer.length
  });
}

