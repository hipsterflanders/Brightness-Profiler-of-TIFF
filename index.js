//const GeoTIFF = require('geotiff');
const express = require('express');
const fetch = require('node-fetch');
//const fs = require('fs');
const app = express();
console.log('starting TP feed server');

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Starting server at ${port}`));
app.use(express.static('public'));
app.use(express.json({ limit: '1Gb' }));



app.get('/data', async (request, response) => {
    response.json({data:''});
});