const fs = require('fs');
const path = require('path');
const https = require('https');

const collectionPath = path.join(__dirname, '../Swarna_Bindu_Gold_Scheme_API.postman_collection.json');
const collectionData = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Format body correctly: wrap the collection inside a root "collection" property
const requestBody = JSON.stringify({ collection: collectionData });

const apiKey = 'PMAK-6a2bb1a85d509100013d1f9e-497fffd578b4d0aec14a2d21c5c5f20891';
const collectionUid = '27694916-ab4eea52-b6cd-492b-bb24-27c8eef4641c';

const options = {
  hostname: 'api.getpostman.com',
  port: 443,
  path: `/collections/${collectionUid}`,
  method: 'PUT',
  headers: {
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

console.log(`📤 Sending collection update request to Postman Cloud (UID: ${collectionUid})...`);

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log(`📥 Response Status Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(responseData);
      if (res.statusCode === 200) {
        console.log('✅ Postman Collection successfully updated and synced in the cloud!');
        console.log(`Collection Details: ${parsed.collection.name} (UID: ${parsed.collection.uid})`);
      } else {
        console.error('❌ Failed to update Postman collection:', parsed);
      }
    } catch (err) {
      console.error('❌ Could not parse response JSON:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Network error while syncing with Postman: ${e.message}`);
});

// Write data to request body
req.write(requestBody);
req.end();
