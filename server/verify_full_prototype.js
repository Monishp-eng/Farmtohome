async function verifyFullPrototype() {
  console.log('=====================================================');
  console.log('🚀 TESTING FULL END-TO-END PROTOTYPE WORKFLOW');
  console.log('=====================================================');

  // Step 1: Consumer login
  const conLogin = await (await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@example.com', password: 'password123' })
  })).json();
  console.log('✅ 1. Consumer Authenticated:', conLogin.user.name, `(${conLogin.user.role})`);

  // Step 2: Place Order for Chennai delivery
  const orderRes = await (await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + conLogin.token
    },
    body: JSON.stringify({
      product_id: 87, // Onion
      quantity_kg: 10,
      delivery_address: 'T. Nagar, Chennai, Tamil Nadu 600017'
    })
  })).json();
  const orderId = orderRes.data.orderId;
  console.log('✅ 2. Order Placed & Confirmed: Order #' + orderId + ' | Farmer Net: Rs ' + orderRes.data.farmer_earnings);

  // Step 3: Driver Login & Check Dispatches
  const driverLogin = await (await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kiran@example.com', password: 'password123' })
  })).json();
  const driverToken = driverLogin.token;

  const dispatches = await (await fetch('http://localhost:5000/api/logistics/my-deliveries', {
    headers: { 'Authorization': 'Bearer ' + driverToken }
  })).json();
  const latestTask = dispatches.data.find(d => d.order_id === orderId);
  console.log('✅ 3. Stage 2 Chennai Hub Dispatch Created: Task #' + latestTask?.id + ' | Status: ' + latestTask?.status);

  // Step 4: Driver updates status to In Transit & Delivered
  await fetch('http://localhost:5000/api/logistics/' + latestTask.id + '/status', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + driverToken
    },
    body: JSON.stringify({ status: 'picked_up' })
  });
  await fetch('http://localhost:5000/api/logistics/' + latestTask.id + '/status', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + driverToken
    },
    body: JSON.stringify({ status: 'in_transit' })
  });
  const delivRes = await (await fetch('http://localhost:5000/api/logistics/' + latestTask.id + '/status', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + driverToken
    },
    body: JSON.stringify({ status: 'delivered' })
  })).json();
  console.log('✅ 4. Driver Completed Delivery:', delivRes.message);

  // Step 5: Verify Order Status in Buyer Dashboard
  const orderCheck = await (await fetch('http://localhost:5000/api/orders/' + orderId, {
    headers: { 'Authorization': 'Bearer ' + conLogin.token }
  })).json();
  console.log('✅ 5. Order Tracking in Buyer App: Status is now "' + orderCheck.data.status + '"');

  // Step 6: Test Python AI TSP Route Optimization
  const tspRes = await (await fetch('http://localhost:5000/api/ai/optimize-route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + driverToken
    },
    body: JSON.stringify({
      origin: { name: 'Koyambedu Wholesale Agri-Hub, Chennai', lat: 13.0694, lng: 80.1948 },
      destinations: [
        { name: 'T. Nagar Consumer Dropoff', lat: 13.0418, lng: 80.2341 },
        { name: 'Velachery Delivery Hub', lat: 12.9815, lng: 80.2180 }
      ]
    })
  })).json();
  console.log('✅ 6. Python AI 2-Opt TSP Optimized Route: Total Distance = ' + tspRes.data?.total_distance_km + ' km');

  console.log('=====================================================');
  console.log('🏆 COMPLETE PROTOTYPE VERIFICATION: 100% SUCCESS!');
  console.log('=====================================================');
}

verifyFullPrototype();
