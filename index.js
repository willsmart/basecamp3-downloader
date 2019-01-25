// basecamp3downloader ( https://github.com/willsmart/basecamp3-downloader )
// Author: Will Smart ( https://github.com/willsmart )
// Licence: MIT
//   Please enjoy and tweak as you see fit.
//   This code has worked well for me. But I imply no guarantee and use of my original code is at your own risk in every way allowed by law.

let helpText = '',
  missingArgumentText = '';
const token = getProcessArgument(
    ['--token', '-t'],
    'The access token to use to access the basecamp api.\n See the readme if you are unsure how to obtain a token.\n(Can also use the BC3_EMAIL environment variable)',
    'Please provide an access token via the BC3_TOKEN env variable or the --token command line argument.\nSee the readme if you are unsure how to obtain a token.',
    undefined,
    process.env.BC3_TOKEN
  ),
  email = getProcessArgument(
    ['--email', '-e'],
    'Your email address.\n This is used in the user agent string sent to basecamp.\n(Can also use the BC3_EMAIL environment variable)',
    'Please provide your email address via the BC3_EMAIL env variable or the --email command line argument.\nThis is used in the user agent string sent to basecamp.',
    undefined,
    process.env.BC3_EMAIL
  ),
  accountId = getProcessArgument(
    ['--account', '-a'],
    'The account id of the account to download.\n This is used as the base from which to search for resources.\n It is the first number in the URL when looking at your basecamp page.\n(Can also use the BC3_EMAIL environment variable)',
    'Please provide an account id via the BC3_ACCOUNT env variable or the --account command line argument.\nThis is used as the base from which to search for resources to download.',
    undefined,
    process.env.BC3_ACCOUNT
  ),
  app =
    getProcessArgument(
      '--app',
      "The app name.\n This is used in the user agent string sent to basecamp.\nDefault is 'basecamp3downloader'"
    ) || 'basecamp3downloader',
  delayPerURL =
    getProcessArgument(
      ['--delayeach', '-d'],
      'The delay per iteration. Essentially this is the number of milliseconds between requests to the basecamp api.\nDefault is a well-mannered 1000'
    ) || 1000,
  maxIteration =
    getProcessArgument(
      '--til',
      'The number of iterations to do before early-stopping. This is useful for testing the waters on a new setup (try --til=10).\nDefault is 0 (i.e. unlimited)'
    ) || 0,
  writeTempPer =
    getProcessArgument(
      '--tempeach',
      'The number of iterations to do between writing each temoporary file (just incase of a crash. This script can take a long time).\nDefaults to 10.'
    ) || 10,
  showHelp = getProcessArgument('--help', 'Show this help screen.', undefined, true),
  fs = require('fs'),
  { promisify } = require('util'),
  request_p = promisify(require('request')),
  headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': `${app} (${email})`
  },
  basecampApiPrefix = 'https://3.basecampapi.com/',
  baseURL = `${basecampApiPrefix}${accountId}/projects.json`,
  downloadPaths = {},
  ofile = 'results/results.json',
  tmpofile = 'results/tmp_results.json',
  docDir = 'results/docs',
  pendingURLs = [baseURL];
downloadsByType = {};

if (showHelp || missingArgumentText) {
  if (showHelp) missingArgumentText = '';

  console.log(
    `Usage:\n  node index.js -t '<token>' -e <email> -a <account> <other options>\n  Environment variables can also be used instead of specifying -t, -e, and -a arguments\n\nAll available options:\n${helpText}\n${missingArgumentText}`
  );
  process.exit(missingArgumentText ? 1 : 0);
}

let promiseCount = 0;

// Queue a URL to be downloaded.
// If it is a JSON resource then any other referenced basecamp api URLs in the response will be queued.
function queueURL(url) {
  if (downloadPaths[url]) return;
  console.log(`     queue ${url} --> <${pendingURLs.length}>`);
  downloadPaths[url] = 'pending...';
  pendingURLs.push(url);
}

// Download a resource now. (called from an interval).
// If it is a JSON resource then any other referenced basecamp api URLs in the response will be queued.
function _requestNextURL() {
  const url = pendingURLs.shift();
  if (!url) return;
  promiseCount++;
  console.log(`GET ${url} --> {${promiseCount}}`);
  new Promise(resolve => {
    request_p({ url, headers, encoding: null }, (error, response, buffer) => {
      let body;
      promiseCount--;
      const contentType = /^(?:\w+\/)?([^; ,]*)/.exec(response.headers['content-type'])[1];
      console.log(`   -> got ${url} --> {${promiseCount}}`);
      if (error) {
        buffer = new Buffer(JSON.stringify({ error: error.message || 'Failed download' }));
        contentType = 'json';
      }
      dealWithBody(url, buffer, contentType);
    });
  });
}

// Deal with the response from a request to the api
function dealWithBody(url, buffer, contentType) {
  const partRE = /(?<=\/)[a-z_]+(?=\/)/g,
    path = [];
  let downloads = downloadsByType,
    part;
  while ((part = partRE.exec(url))) {
    path.push(part[0]);
    downloads = downloads[part[0]] || (downloads[part[0]] = {});
  }
  path.push(contentType);
  (downloads = downloads[contentType] || (downloads[contentType] = {})), (downloadPaths[url] = path.join(', '));

  if (contentType == 'json') {
    let body = buffer.toString(),
      bodyObj;
    try {
      bodyObj = JSON.parse(body);
    } catch (e) {
      console.error(e);
      bodyObj = { invalidJSON: body };
    }

    downloads[url] = bodyObj;

    // search for child resources to grab
    spider(bodyObj);
  } else {
    // if it is not JSON, then save the file to the filesystem

    // an attempt at making a reasonable filename fromn the url
    fn = `${docDir}/${decodeURI(url.replace('https://3.basecampapi.com/', ''))
      .replace(/\//g, ' - ')
      .replace(/[#`"'/$|^?*&~;()[\]<>{}%]/g, '_')}`;
    fs.writeFile(fn, buffer, err => {
      if (err) console.error(`Failed to write ${fn}`);
      else console.log(`>>>>>> Wrote ${fn}`);
    });

    // just store the filename in the result JSON
    downloads[url] = fn;
  }
}

async function spider(value) {
  if (Array.isArray(value)) {
    for (const v of value) spider(v);
  } else if (value && typeof value == 'object') {
    for (const v of Object.values(value)) spider(v);
  } else if (typeof value == 'string') {
    if (value.startsWith(basecampApiPrefix)) queueURL(value);
  }
}

function getResults() {
  try {
    return JSON.stringify({ byURL: downloadPaths, byPath: downloadsByType }, null, 2);
  } catch (e) {
    console.error('Failed to stringify downloads. Not sure how that could happen sorry');
    process.exit(1);
  }
}

// Main loop
let ival,
  it = 0;
_requestNextURL();
ival = setInterval(() => {
  it++;
  console.log(`[${(it * delayPerURL) / 1000.0}] <${pendingURLs.length}> {${promiseCount}}`);

  if (!(it % writeTempPer)) {
    const results = getResults();
    fs.writeFile(tmpofile, results, err => {
      if (err) {
        console.log(`\n\n\n${results}\n\n\n`);
        console.error(`Failed to write results to ${tmpofile}`);
      }
    });
  }

  if (it == maxIteration || !(promiseCount || pendingURLs.length)) {
    clearInterval(ival);
    const results = getResults();
    fs.writeFile(ofile, results, err => {
      if (err) {
        console.log(`\n\n\n${results}\n\n\n`);
        console.error(`Failed to write results to ${ofile}`);
      } else console.log(`Wrote results to ${ofile}`);
      console.log(`\n\n\ndone.`);
    });
    return;
  }
  _requestNextURL();
}, delayPerURL);

// misc util

function getProcessArgument(keys, thisHelpText, thisMissingArgumentText, givenValue, defaultValue) {
  if (!Array.isArray(keys)) keys = [keys];

  if (thisHelpText) {
    helpText += `  ${keys.join(', ')}:\n    : ${thisHelpText.replace(/\n/g, '\n    : ')}\n`;
  }

  let isNext;
  for (const arg of process.argv) {
    if (isNext) return arg;
    for (const key of keys) {
      if (arg.startsWith(`${key}=`)) return arg.substring(key.length + 1);
      if (arg == key) {
        if (givenValue) return givenValue;
        isNext = true;
      }
    }
  }

  if (defaultValue !== undefined) return defaultValue;

  if (thisMissingArgumentText) {
    missingArgumentText += `\n${thisMissingArgumentText}\n`;
  }
}
