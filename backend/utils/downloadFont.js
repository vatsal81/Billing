const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://github.com/fedora-hindi/lohit-gujarati/raw/master/Lohit-Gujarati.ttf';
const dest = path.join(__dirname, 'Lohit-Gujarati.ttf');

const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  if (response.statusCode === 302) {
    https.get(response.headers.location, function(redirect) {
      redirect.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Download complete');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Download complete');
    });
  }
}).on('error', function(err) {
  fs.unlink(dest);
  console.error(err.message);
});
