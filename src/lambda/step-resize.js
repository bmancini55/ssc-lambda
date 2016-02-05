/**
 * Resizes an image to the specified by doing the following:
 * 1) loading the original image from S3
 * 2) resizing the image using graphics magick
 * 3) uploading the resized image to S3
 * 4) update the state record
 */

let Bluebird = require('bluebird');
let path     = require('path');
let AWS      = require('aws-sdk');
let gm       = require('gm').subClass({ imageMagick: true });
let deepcopy = require('deepcopy');
let config   = require('../../config');
let s3       = Bluebird.promisifyAll(new AWS.S3());

module.exports = process;

async function process(record, width) {

  let stock_no       = record.stock_no;
  let sourceFilePath = 'test/items/' + stock_no + '.jpg';
  let fileName       = path.basename(sourceFilePath, '.jpg');
  let ext            = path.extname(sourceFilePath);
  let destFolder     = 'test/items/';

  // load image
  let image = await loadImage(sourceFilePath);
  if(!image) return record;
  console.log('Found image of size: %d', image.length);

  // process image
  let buffer = await resizeImage(image, width);
  console.log('Resized to: %d', buffer.length);

  // upload resized
  let destFilePath = path.join(destFolder, fileName + '_' + width + ext);
  await uploadImage(destFilePath, buffer);
  console.log('Uploaded: %s', destFilePath);

  // mutate record state
  let newRecord = deepcopy(record);
  newRecord['size_' + width] = true;
  return newRecord;
}



async function loadImage(sourceFilePath) {
  let opts = {
    Bucket: config.aws.s3Bucket,
    Key: sourceFilePath
  };
  let result = await s3.getObjectAsync(opts);
  let buffer = result.Body;

  return buffer;
}

async function resizeImage(buffer, width) {
  return new Promise((resolve, reject) => {
    gm(buffer)
    .resize(width)
    .toBuffer('JPG', (err, buffer2) => {
      if(err) reject(err);
      else    resolve(buffer2);
    });
  });
}


async function uploadImage(filePath, buffer) {
  await s3.putObjectAsync({
    Bucket: config.aws.s3Bucket,
    Key: filePath,
    ACL: 'public-read',
    Body: buffer,
    ContentType: 'image/jpg',
    ContentLength: buffer.length
  });
}
