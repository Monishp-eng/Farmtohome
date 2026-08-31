# Test Suite for Module 2: Marketplace & Matching Engine
$baseUrl = "http://localhost:5000/api"
$passed = 0
$total = 6

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RUNNING TEST SUITE: MODULE 2 (MARKETPLACE & MATCHING)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Test Product Browse with Price Benchmarks & Distance
Write-Host "`n[Test 1/6] GET /api/products (Filters, Distance & Mandi Benchmarks)..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/products?user_lat=12.9716&user_lng=77.5946" -Method GET
    if ($res.success -and $res.data.Count -gt 0 -and $res.data[0].benchmarks -and $res.data[0].bulk_details) {
        Write-Host " PASS (Count: $($res.data.Count), Benchmark Mandi: Rs $($res.data[0].benchmarks.mandi_modal_price)/kg)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL (Missing benchmarks or bulk details)" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test Buyer Persona Filter (Bulk Buyer MOQ >= 50kg)
Write-Host "[Test 2/6] GET /api/products?buyer_type=bulk (Bulk Buyer MOQ Filter)..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/products?buyer_type=bulk" -Method GET
    $allAbove50 = $true
    foreach ($p in $res.data) {
        if ($p.quantity_kg -lt 50) { $allAbove50 = $false; break }
    }
    if ($res.success -and $allAbove50) {
        Write-Host " PASS (All $($res.data.Count) bulk lots have >= 50kg stock)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL (Found items with < 50kg stock in bulk view)" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test Single Product Detail & Wholesale Tier Calculations
Write-Host "[Test 3/6] GET /api/products/1 (Wholesale Tier Calculation)..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/products/1" -Method GET
    if ($res.success -and $res.data.bulk_details.tiers.Count -eq 4 -and $res.data.benchmarks) {
        Write-Host " PASS (4 Wholesale Tiers & MSP: Rs $($res.data.benchmarks.msp_price)/kg)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL (Invalid tiers or benchmarks)" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test User Login for Consumer Order
$token = ""
try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body (@{
        email = "priya@example.com"
        password = "password123"
    } | ConvertTo-Json) -ContentType "application/json"
    $token = $loginRes.data.token
} catch {
    Write-Host "Login error: $($_.Exception.Message)"
}

# 5. Test Bulk Contract Order Placement & Auto-Logistics Mirroring
Write-Host "[Test 4/6] POST /api/orders (Bulk Contract Order & Logistics Auto-Sync)..." -NoNewline
$newOrderId = $null
try {
    $bulkProds = Invoke-RestMethod -Uri "$baseUrl/products?buyer_type=bulk" -Method GET
    $targetProd = $bulkProds.data[0]
    $prodId = $targetProd.id

    $headers = @{ Authorization = "Bearer $token" }
    $orderPayload = @{
        product_id = $prodId
        quantity_kg = 50
        order_type = "bulk_contract"
        recurring_frequency = "weekly"
        delivery_address = "Indiranagar Bulk Store, Bangalore"
    } | ConvertTo-Json

    $orderRes = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $orderPayload -Headers $headers -ContentType "application/json"
    $newOrderId = $orderRes.data.orderId

    if ($orderRes.success -and $orderRes.data.discountPct -eq 5 -and $orderRes.data.farmer_earnings -gt 0) {
        Write-Host " PASS (Order #$newOrderId placed for '$($targetProd.name)', 5% bulk discount applied, 98% Farmer Pay: Rs $($orderRes.data.farmer_earnings))" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test Order Status Transition Mirroring in Logistics
Write-Host "[Test 5/6] PUT /api/orders/:id/status (Confirmed -> Dispatched -> In Transit Sync)..." -NoNewline
try {
    # Login as admin to update order
    $adminRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body (@{ email = "admin@example.com"; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
    $adminToken = $adminRes.data.token
    $adminHeaders = @{ Authorization = "Bearer $adminToken" }

    # Confirm order
    $update1 = Invoke-RestMethod -Uri "$baseUrl/orders/$newOrderId/status" -Method PUT -Body (@{ status = "confirmed" } | ConvertTo-Json) -Headers $adminHeaders -ContentType "application/json"
    # Dispatch order
    $update2 = Invoke-RestMethod -Uri "$baseUrl/orders/$newOrderId/status" -Method PUT -Body (@{ status = "dispatched" } | ConvertTo-Json) -Headers $adminHeaders -ContentType "application/json"

    # Verify order details
    $getOrd = Invoke-RestMethod -Uri "$baseUrl/orders/$newOrderId" -Method GET -Headers $adminHeaders
    if ($getOrd.data.status -eq "dispatched" -and $getOrd.data.logistics -and $getOrd.data.logistics.status -eq "picked_up") {
        Write-Host " PASS (Order status 'dispatched' mirrored to Logistics status 'picked_up')" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL (Status mismatch: $($getOrd.data.status) / $($getOrd.data.logistics.status))" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test Consumer Order History with 5-Stage Lifecycle Tracking
Write-Host "[Test 6/6] GET /api/orders/my-orders (Buyer Order History & Distance)..." -NoNewline
try {
    $myOrders = Invoke-RestMethod -Uri "$baseUrl/orders/my-orders" -Method GET -Headers $headers
    if ($myOrders.success -and $myOrders.data.Count -gt 0) {
        Write-Host " PASS (Found $($myOrders.data.Count) tracked orders)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  MODULE 2 RESULTS: $passed / $total TESTS PASSED ($([math]::Round($passed/$total * 100))%)" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host "==========================================================" -ForegroundColor Cyan
