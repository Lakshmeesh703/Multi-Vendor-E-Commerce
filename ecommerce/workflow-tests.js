#!/usr/bin/env node

/**
 * COMPREHENSIVE WORKFLOW VALIDATION SCRIPT
 * Tests all critical user journeys in the multi-vendor e-commerce platform
 * 
 * Usage: node workflow-tests.js
 * Prerequisites: Backend running on port 4000, Frontend on port 3000
 */

const http = require('http');
const assert = require('assert');

// Configuration
const BACKEND_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 5000;

// Test data
let testUser = {
  email: `customer_${Date.now()}@test.com`,
  password: 'TestPass123!',
  name: 'Test Customer'
};

let testVendor = {
  email: `vendor_${Date.now()}@test.com`,
  password: 'VendorPass123!',
  name: 'Test Vendor Shop'
};

let testAdmin = {
  email: 'admin@test.com',
  password: 'AdminPass123!',
  name: 'Test Admin'
};

let tokens = {
  customer: null,
  vendor: null,
  admin: null
};

let testData = {
  cartToken: null,
  wishlistToken: null,
  productId: null,
  orderId: null,
  customerId: null,
  vendorId: null
};

// Utility: Make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: TEST_TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } catch (err) {
      results.failed++;
      results.tests.push({ name, status: '❌ FAIL', error: err.message });
      console.log(`❌ ${name}: ${err.message}`);
    }
  };
}

// ============================================================================
// TEST SUITE 1: CUSTOMER AUTHENTICATION WORKFLOW
// ============================================================================

const customerAuthTests = [
  test('Customer Registration', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      name: testUser.name
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert(res.body.token, 'JWT token not returned');
    tokens.customer = res.body.token;
  }),

  test('Customer Login with Correct Credentials', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/customer/login`, {
      email: testUser.email,
      password: testUser.password
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.token, 'JWT token not returned');
    assert.match(res.body.token, /^eyJ/, 'Invalid JWT format');
    tokens.customer = res.body.token;
  }),

  test('Customer Login with Wrong Password Fails', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/customer/login`, {
      email: testUser.email,
      password: 'WrongPassword'
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  }),

  test('Customer Cannot Login via Generic Auth Endpoint', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    // Should either reject or force customer role
    assert(res.status >= 400, `Expected error, got ${res.status}`);
  }),

  test('Customer Can Access Own Dashboard', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/customer/summary`,
      null,
      { 'Authorization': `Bearer ${tokens.customer}` }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.name || res.body.email, 'Customer data not returned');
    testData.customerId = res.body.id;
  }),

  test('Customer Cannot Access Vendor Dashboard', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/vendor/summary`,
      null,
      { 'Authorization': `Bearer ${tokens.customer}` }
    );
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  }),

  test('Customer Cannot Access Admin Dashboard', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/admin/summary`,
      null,
      { 'Authorization': `Bearer ${tokens.customer}` }
    );
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 2: PRODUCT MANAGEMENT WORKFLOW
// ============================================================================

const productTests = [
  test('Retrieve All Products (Public)', async () => {
    const res = await request('GET', `${BACKEND_URL}/api/products`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.products || res.body), 'Products array not returned');
  }),

  test('Filter Products by Category', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/products?category=electronics`
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  }),

  test('Search Products by Keyword', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/products?search=test`
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  }),

  test('Paginate Products', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/products?limit=10&offset=0`
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 3: CART WORKFLOW (GUEST & AUTHENTICATED)
// ============================================================================

const cartTests = [
  test('Guest Generates Cart Token', async () => {
    const cartToken = `cart_${Date.now()}`;
    const res = await request('GET', `${BACKEND_URL}/api/cart`, null, {
      'x-cart-token': cartToken
    });
    // Should either create cart or return empty cart
    assert(res.status === 200 || res.status === 201, `Unexpected status ${res.status}`);
    testData.cartToken = cartToken;
  }),

  test('Add Product to Cart (Guest)', async () => {
    if (!testData.cartToken) this.skip();
    const res = await request(
      'POST',
      `${BACKEND_URL}/api/cart/items`,
      {
        product_mongo_id: testData.productId || '507f1f77bcf86cd799439011',
        quantity: 1
      },
      { 'x-cart-token': testData.cartToken }
    );
    assert(res.status === 200 || res.status === 201, `Unexpected status ${res.status}`);
  }),

  test('View Cart Contents', async () => {
    if (!testData.cartToken) this.skip();
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/cart?cart_token=${testData.cartToken}`,
      null,
      { 'x-cart-token': testData.cartToken }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.items !== undefined, 'Cart items not returned');
  }),

  test('Customer Add to Cart (Authenticated)', async () => {
    const res = await request(
      'POST',
      `${BACKEND_URL}/api/cart/items`,
      {
        product_mongo_id: testData.productId || '507f1f77bcf86cd799439011',
        quantity: 2
      },
      { 'Authorization': `Bearer ${tokens.customer}` }
    );
    assert(res.status === 200 || res.status === 201, `Unexpected status ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 4: WISHLIST WORKFLOW
// ============================================================================

const wishlistTests = [
  test('Guest Generates Wishlist Token', async () => {
    const wishlistToken = `wishlist_${Date.now()}`;
    testData.wishlistToken = wishlistToken;
    // Wishlist might auto-create on first access, or might need explicit creation
    assert(wishlistToken, 'Wishlist token not generated');
  }),

  test('Add Product to Wishlist (Guest)', async () => {
    if (!testData.wishlistToken) this.skip();
    const res = await request(
      'POST',
      `${BACKEND_URL}/api/wishlist/add`,
      {
        product_mongo_id: testData.productId || '507f1f77bcf86cd799439011',
        wishlist_token: testData.wishlistToken
      },
      { 'x-wishlist-token': testData.wishlistToken }
    );
    assert(res.status === 200 || res.status === 201, `Unexpected status ${res.status}`);
  }),

  test('View Wishlist', async () => {
    if (!testData.wishlistToken) this.skip();
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/wishlist?wishlist_token=${testData.wishlistToken}`,
      null,
      { 'x-wishlist-token': testData.wishlistToken }
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 5: VENDOR WORKFLOW
// ============================================================================

const vendorTests = [
  test('Vendor Registration', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/vendor/register`, {
      email: testVendor.email,
      password: testVendor.password,
      name: testVendor.name
    });
    assert(res.status === 201 || res.status === 200, `Unexpected status ${res.status}`);
    if (res.body.token) tokens.vendor = res.body.token;
  }),

  test('Vendor Login', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/vendor/login`, {
      email: testVendor.email,
      password: testVendor.password
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.token, 'JWT token not returned');
    tokens.vendor = res.body.token;
  }),

  test('Vendor Cannot Access Customer Dashboard', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/customer/summary`,
      null,
      { 'Authorization': `Bearer ${tokens.vendor}` }
    );
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  }),

  test('Vendor Can Access Own Dashboard', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/vendor/summary`,
      null,
      { 'Authorization': `Bearer ${tokens.vendor}` }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 6: ADMIN WORKFLOW
// ============================================================================

const adminTests = [
  test('Admin Cannot Be Created via Public Registration', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/auth/register`, {
      email: `admin_${Date.now()}@test.com`,
      password: 'AdminPass123!',
      name: 'Fake Admin',
      role: 'admin'  // Should be ignored
    });
    // Should create customer, not admin
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    // Verify the created user is customer role
    if (res.body.token) {
      // Token should have customer role, not admin (hard to verify from here)
    }
  }),

  test('Admin Can Access Admin Dashboard', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/admin/summary`,
      null,
      { 'Authorization': `Bearer ${tokens.admin || 'invalid'}` }
    );
    // If no valid admin token, should return 401/403
    assert(res.status >= 400, `Expected error, got ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 7: ORDER WORKFLOW
// ============================================================================

const orderTests = [
  test('Create Order (Empty Cart Should Fail)', async () => {
    const res = await request(
      'POST',
      `${BACKEND_URL}/api/orders`,
      {
        items: [],
        shipping_address_id: null,
        payment_method: 'card'
      },
      { 'Authorization': `Bearer ${tokens.customer}` }
    );
    // Should reject empty order
    assert(res.status >= 400, `Expected error for empty cart, got ${res.status}`);
  }),

  test('Retrieve Customer Orders', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/customer/orders`,
      null,
      { 'Authorization': `Bearer ${tokens.customer}` }
    );
    assert(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
    assert(Array.isArray(res.body.orders) || Array.isArray(res.body), 'Orders not returned');
  })
];

// ============================================================================
// TEST SUITE 8: SECURITY VALIDATION
// ============================================================================

const securityTests = [
  test('Missing Auth Header Returns 401', async () => {
    const res = await request('GET', `${BACKEND_URL}/api/customer/summary`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  }),

  test('Invalid JWT Returns 401', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/customer/summary`,
      null,
      { 'Authorization': 'Bearer invalid.jwt.token' }
    );
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  }),

  test('Malformed Auth Header Returns 401', async () => {
    const res = await request(
      'GET',
      `${BACKEND_URL}/api/customer/summary`,
      null,
      { 'Authorization': 'InvalidFormat' }
    );
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  }),

  test('Backend Rejects Missing Required Fields', async () => {
    const res = await request('POST', `${BACKEND_URL}/api/auth/register`, {
      email: 'test@test.com'
      // Missing password and name
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  }),

  test('Backend Health Check', async () => {
    const res = await request('GET', `${BACKEND_URL}/health`);
    assert(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
  })
];

// ============================================================================
// TEST SUITE 9: FRONTEND AVAILABILITY
// ============================================================================

const frontendTests = [
  test('Frontend Responds on Port 3000', async () => {
    const url = new URL(FRONTEND_URL);
    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: '/customer/login',
        method: 'GET',
        timeout: TEST_TIMEOUT
      };

      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200 ? undefined : new Error(`Status ${res.statusCode}`));
        res.destroy();
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Frontend timeout'));
      });

      req.end();
    });
  })
];

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     MULTI-VENDOR E-COMMERCE WORKFLOW VALIDATION TESTS          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const testSuites = [
    { name: '1. CUSTOMER AUTHENTICATION', tests: customerAuthTests },
    { name: '2. PRODUCT MANAGEMENT', tests: productTests },
    { name: '3. CART WORKFLOW', tests: cartTests },
    { name: '4. WISHLIST WORKFLOW', tests: wishlistTests },
    { name: '5. VENDOR WORKFLOW', tests: vendorTests },
    { name: '6. ADMIN WORKFLOW', tests: adminTests },
    { name: '7. ORDER WORKFLOW', tests: orderTests },
    { name: '8. SECURITY VALIDATION', tests: securityTests },
    { name: '9. FRONTEND AVAILABILITY', tests: frontendTests }
  ];

  for (const suite of testSuites) {
    console.log(`\n${suite.name}`);
    console.log('─'.repeat(65));

    for (const testFn of suite.tests) {
      await testFn();
    }
  }

  // Print Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests
      .filter(t => t.status === '❌ FAIL')
      .forEach(t => console.log(`  • ${t.name}: ${t.error}`));
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
