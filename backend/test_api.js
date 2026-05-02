const https = require('https');

const text = "vatsal patel";
const url = `https://www.google.com/inputtools/request?text=${encodeURIComponent(text)}&ime=transliteration_en_gu&num=1`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});
