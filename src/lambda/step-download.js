/**
 * This step peforms the download of the raw image from a comic
 * image service. It does the following steps:
 * 1) authenticates with the comic service
 * 2) fetches the image into a buffer
 * 3) uploads the image into S3 for use in future operations
 */

let Bluebird     = require('bluebird');
let path         = require('path');
let fs           = require('fs');
let AWS          = require('aws-sdk');
let request      = Bluebird.promisifyAll(require('request'));
let deepcopy     = require('deepcopy');
let config       = require('../../config');


module.exports = download;

async function download(record) {

  let { stock_no } = record;
  let { s3Bucket } = config.aws;

  let filePath = 'test/items/' + stock_no + '.jpg';

  let jar = await authenticate(config.diamond);
  console.log('Successfully authenticated');

  let buffer = await fetch({ stock_no, jar });
  console.log('Image buffer downloaded %d', buffer.length);

  await upload({ filePath, buffer, s3Bucket });
  console.log('File has been uploaded to %s', filePath);


  let result = deepcopy(record);
  result.hasRaw = true;
  return result;
}


async function authenticate({ username, customerNo, password }) {
  console.log('Authenticating %s', username);

  let jar = request.jar();
  let opts = {
    url: 'https://retailerservices.diamondcomics.com/Login/Login?ReturnUrl=%2f',
    jar: jar,
    followRedirect: false,
    form: {
      UserName: username,
      EnteredCustNo: customerNo,
      Password: password,
      RememberMe: false,
      Submit: 'Login'
    },
    headers: {
      'UserAgent': 'Mozilla / 5.0(Windows NT 6.1; WOW64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 42.0.2311.135 Safari / 537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referrer': 'https://retailerservices.diamondcomics.com/Login/Login?ReturnUrl=%2f',
      'Origin': 'https://retailerservices.diamondcomics.com'
    }
  };
  await request.postAsync(opts);
  return jar;
}



async function fetch({ stock_no, jar }) {
  return new Promise(function(resolve, reject) {

    let outdir      = '/tmp';
    let outfilepath = path.join(outdir, stock_no + '.jpg');
    let writestream = fs.createWriteStream(outfilepath);

    // make request
    let opts = {
      url: 'https://retailerservices.diamondcomics.com/Image/Resource/1/' + stock_no,
      jar: jar,
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

