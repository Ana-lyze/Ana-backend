const Twitter = require('twitter');
const express = require('express');
const async = require('async');
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
const app = express();
const bodyParser = require('body-parser');
const snoowrap = require('snoowrap');

const secret = require('./secret');

const twitter = new Twitter(secret.twitter);
const reddit = new snoowrap(secret.reddit);
const tone_analyzer = new ToneAnalyzerV3(secret.watson);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.options('*', (req, res, next) => {
  res.send();
});

const twitterSearch = (q, result_type, cb) => {
  twitter.get(`search/tweets.json?q=${q}&result_type=${result_type}&tweet_mode=extended`, (err, { statuses }) => {
    if (err) return cb(err);
    if (statuses.length) return cb(null, statuses);
    if (result_type == 'popular') return twitterSearch(q, 'recent', cb);
    cb(new Error('No Data'));
  });
};

app.get('/', (req, res, next) => {
  async.waterfall([
    (cb) => {
      const { q } = req.query;
      async.parallel({
        twitter: (cb) => {
          twitterSearch(q, 'popular', cb);
        },
        reddit: (cb) => {
          reddit.search({ query: q })
            .then(cb.bind(this, null))
            .catch(cb);
        },
      }, cb);
    },
    ({ twitter, reddit }, cb) => {
      res.json({ twitter, reddit });
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