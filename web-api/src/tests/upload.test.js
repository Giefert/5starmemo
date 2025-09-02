const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'uploadtest@5starmemo.com',
  username: 'uploadtester',
  password: 'testpass123',
  role: 'management'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', reject);

    if (data) {
      if (data instanceof FormData) {
        // Handle FormData
        data.pipe(req);
      } else {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
        req.end();
      }
    } else {
      req.end();
    }
  });
}

// Helper function to create a test image
function createTestImage() {
  const testImagePath = path.join(__dirname, 'test-image.png');
  // Create a minimal valid PNG file
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
    0x00, 0x00, 0x00, 0x0D,                          // IHDR chunk length
    0x49, 0x48, 0x44, 0x52,                          // IHDR
    0x00, 0x00, 0x00, 0x01,                          // width = 1
    0x00, 0x00, 0x00, 0x01,                          // height = 1  
    0x08, 0x02, 0x00, 0x00, 0x00,                    // bit depth, color type, etc.
    0x90, 0x77, 0x53, 0xDE,                          // CRC
    0x00, 0x00, 0x00, 0x0C,                          // IDAT chunk length
    0x49, 0x44, 0x41, 0x54,                          // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
    0xE2, 0x21, 0xBC, 0x33,                          // CRC
    0x00, 0x00, 0x00, 0x00,                          // IEND chunk length
    0x49, 0x45, 0x4E, 0x44,                          // IEND
    0xAE, 0x42, 0x60, 0x82                           // CRC
  ]);
  
  fs.writeFileSync(testImagePath, pngData);
  return testImagePath;
}

// Test runner
async function runTests() {
  console.log('🧪 Starting Upload Endpoint Tests\n');
  
  let authToken = null;
  let testImagePath = null;
  let testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Helper function to log test results
  function logTest(name, passed, message = '') {
    if (passed) {
      console.log(`✅ ${name}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${name}: ${message}`);
      testResults.failed++;
      testResults.errors.push(`${name}: ${message}`);
    }
  }

  try {
    // Setup: Create test user and get auth token
    console.log('Setup: Creating test user...');
    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, TEST_USER);

    if (registerResponse.statusCode === 200 || registerResponse.statusCode === 201) {
      const registerData = JSON.parse(registerResponse.data);
      authToken = registerData.data.token;
      console.log('✅ Test user created successfully\n');
    } else {
      // Try to login with existing user
      const loginResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, { email: TEST_USER.email, password: TEST_USER.password });

      if (loginResponse.statusCode === 200) {
        const loginData = JSON.parse(loginResponse.data);
        authToken = loginData.data.token;
        console.log('✅ Logged in with existing test user\n');
      } else {
        throw new Error('Could not create or login test user');
      }
    }

    // Setup: Create test image
    testImagePath = createTestImage();
    console.log('✅ Test image created\n');

    // Test 1: Upload image without authentication
    console.log('Test 1: Upload without authentication');
    const form1 = new FormData();
    form1.append('image', fs.createReadStream(testImagePath));
    
    const uploadNoAuth = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/image',
      method: 'POST',
      headers: form1.getHeaders()
    }, form1);

    logTest(
      'Should reject upload without authentication', 
      uploadNoAuth.statusCode === 401,
      `Expected 401, got ${uploadNoAuth.statusCode}`
    );

    // Test 2: Upload image with invalid token
    console.log('Test 2: Upload with invalid token');
    const form2 = new FormData();
    form2.append('image', fs.createReadStream(testImagePath));
    
    const uploadBadAuth = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/image',
      method: 'POST',
      headers: {
        ...form2.getHeaders(),
        'Authorization': 'Bearer invalid-token'
      }
    }, form2);

    logTest(
      'Should reject upload with invalid token',
      uploadBadAuth.statusCode === 403,
      `Expected 403, got ${uploadBadAuth.statusCode}`
    );

    // Test 3: Upload image with valid authentication
    console.log('Test 3: Upload with valid authentication');
    const form3 = new FormData();
    form3.append('image', fs.createReadStream(testImagePath));
    
    const uploadValid = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/image',
      method: 'POST',
      headers: {
        ...form3.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    }, form3);

    const uploadSuccess = uploadValid.statusCode === 200;
    let uploadedImageUrl = null;
    
    if (uploadSuccess) {
      const uploadData = JSON.parse(uploadValid.data);
      uploadedImageUrl = uploadData.data.imageUrl;
    }

    logTest(
      'Should successfully upload image with valid auth',
      uploadSuccess && uploadedImageUrl,
      uploadSuccess ? '' : `Expected 200, got ${uploadValid.statusCode}`
    );

    // Test 4: Upload without file
    console.log('Test 4: Upload without file');
    const form4 = new FormData();
    
    const uploadNoFile = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/image',
      method: 'POST',
      headers: {
        ...form4.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    }, form4);

    logTest(
      'Should reject upload without file',
      uploadNoFile.statusCode === 400 || uploadNoFile.statusCode === 500,
      `Expected 400 or 500, got ${uploadNoFile.statusCode}`
    );

    // Test 5: Upload non-image file
    console.log('Test 5: Upload non-image file');
    const textFilePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(textFilePath, 'This is not an image');
    
    const form5 = new FormData();
    form5.append('image', fs.createReadStream(textFilePath));
    
    const uploadNonImage = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload/image',
      method: 'POST',
      headers: {
        ...form5.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    }, form5);

    logTest(
      'Should reject non-image file',
      uploadNonImage.statusCode === 500, // Multer fileFilter should reject this
      `Expected rejection, got ${uploadNonImage.statusCode}`
    );

    // Cleanup non-image test file
    fs.unlinkSync(textFilePath);

    // Test 6: Verify uploaded image is accessible
    if (uploadedImageUrl) {
      console.log('Test 6: Verify uploaded image accessibility');
      const imageAccessible = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: uploadedImageUrl,
        method: 'GET'
      });

      logTest(
        'Should be able to access uploaded image',
        imageAccessible.statusCode === 200,
        `Expected 200, got ${imageAccessible.statusCode}`
      );
    }

  } catch (error) {
    console.error('❌ Test setup error:', error.message);
    testResults.errors.push(`Setup error: ${error.message}`);
    testResults.failed++;
  }

  // Cleanup
  if (testImagePath && fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }

  // Print results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n🎯 Upload endpoint tests completed!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };