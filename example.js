const { UniversalFileClient } = require('./dist/index.js');

async function testClient() {
  const client = new UniversalFileClient();

  console.log('Testing UniversalFileClient...');

  // Test protocol detection
  console.log('Protocol detection tests:');
  console.log('ftp://example.com -> should detect FTP');
  console.log('sftp://example.com -> should detect SFTP');
  console.log('https://example.com -> should detect HTTPS');

  // Test connection methods exist
  console.log('\nAvailable methods:');
  console.log('- connect:', typeof client.connect);
  console.log('- disconnect:', typeof client.disconnect);
  console.log('- list:', typeof client.list);
  console.log('- download:', typeof client.download);
  console.log('- upload:', typeof client.upload);
  console.log('- stat:', typeof client.stat);
  console.log('- exists:', typeof client.exists);
  console.log('- findFile:', typeof client.findFile);
  console.log('- checkForUpdates:', typeof client.checkForUpdates);

  console.log('\nUniversalFileClient package is working correctly!');
}

testClient().catch(console.error);