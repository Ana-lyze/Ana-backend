const Twitter = require('twitter');
const express = require('express');
const async = require('async');
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
const app = express();
const bodyParser = require('body-parser');

const secret = require('./secret');

const client = new Twitter(secret.twitter);
const tone_analyzer = new ToneAnalyzerV3(secret.watson);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(req.body);
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.options('*', (req, res, next) => {
  res.send();
});

const search = (q, result_type, cb) => {
  client.get(`search/tweets.json?q=${q}&result_type=${result_type}&tweet_mode=extended`, (err, { statuses }) => {
    if (err) return cb(err);
    if (statuses.length) return cb(null, statuses);
    if (result_type == 'popular') return search(q, 'recent', cb);
    cb(new Error('No Data'));
  });
};

app.get('/', (req, res, next) => {
  async.waterfall([
    (cb) => {
      const { q } = req.query;
      search(q, 'popular', cb);
    },
    (statuses, cb) => {
      res.json(statuses);
    }
  ], next);
});

app.post('/', (req, res, next) => {
  async.waterfall([
    (cb) => {
      const { text } = req.body;
      tone_analyzer.tone({ text }, cb);
    },
    ({ document_tone: { tone_categories } }, cb) => {
      res.json({ tone_categories });
    },
  ], next);
});

app.use((req, res, next) => {
  res.status(404);
  res.json({});
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500);
  res.json(err);
});

app.listen(8000);