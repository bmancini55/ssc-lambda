
let Bluebird  = require('bluebird');
let request   = Bluebird.promisifyAll(require('request'));

module.exports = authenticate;

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

