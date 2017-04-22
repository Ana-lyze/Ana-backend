const Twitter = require('twitter');
const express = require('express');
const async = require('async');
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
const app = express();

const secret = require('./secret');

const client = new Twitter(secret.twitter);
const tone_analyzer = new ToneAnalyzerV3(secret.watson);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
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
      search(req.query.q, 'popular', cb);
    },
    (statuses, cb) => {
      const text = statuses.reduce((text, status) => text + ' ' + status.text, '');
      tone_analyzer.tone({ text }, cb);
    },
    ({ document_tone: { tone_categories } }, cb) => {
      res.json({ tone_categories });
    },
  ], next);
  /*  res.json({
   tone_categories: [{
   "tones": [{ "score": 0.054885, "tone_id": "anger", "tone_name": "Anger" }, {
   "score": 0.605191,
   "tone_id": "disgust",
   "tone_name": "Disgust"
   }, { "score": 0.13998, "tone_id": "fear", "tone_name": "Fear" }, {
   "score": 0.450915,
   "tone_id": "joy",
   "tone_name": "Joy"
   }, { "score": 0.545745, "tone_id": "sadness", "tone_name": "Sadness" }],
   "category_id": "emotion_tone",
   "category_name": "Emotion Tone"
   }, {
   "tones": [{ "score": 0, "tone_id": "analytical", "tone_name": "Analytical" }, {
   "score": 0,
   "tone_id": "confident",
   "tone_name": "Confident"
   }, { "score": 0.414448, "tone_id": "tentative", "tone_name": "Tentative" }],
   "category_id": "language_tone",
   "category_name": "Language Tone"
   }, {
   "tones": [{ "score": 0.071745, "tone_id": "openness_big5", "tone_name": "Openness" }, {
   "score": 0.217149,
   "tone_id": "conscientiousness_big5",
   "tone_name": "Conscientiousness"
   }, { "score": 0.07673, "tone_id": "extraversion_big5", "tone_name": "Extraversion" }, {
   "score": 0.587219,
   "tone_id": "agreeableness_big5",
   "tone_name": "Agreeableness"
   }, { "score": 0.117802, "tone_id": "emotional_range_big5", "tone_name": "Emotional Range" }],
   "category_id": "social_tone",
   "category_name": "Social Tone"
   }]
   });*/
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