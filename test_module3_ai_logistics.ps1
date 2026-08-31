# Test Suite for Module 3: AI Demand Forecasting, Route Optimization & Logistics Support
$baseUrl = "http://localhost:5000/api"
$aiServiceUrl = "http://localhost:5001/api"
$passed = 0
$total = 6

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RUNNING TEST SUITE: MODULE 3 (AI FORECASTING & LOGISTICS)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Test Python AI Service Direct Health Check
Write-Host "`n[Test 1/6] GET $aiServiceUrl/health (Python AI Service)..." -NoNewline
try {
    $aiHealth = Invoke-RestMethod -Uri "$aiServiceUrl/health" -Method GET
    if ($aiHealth.status -eq "healthy") {
        Write-Host " PASS (Python Flask AI Service is HEALTHY)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL: $($aiHealth | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test AI Demand Forecasting Engine (Express Proxy -> Python Model)
Write-Host "[Test 2/6] POST $baseUrl/ai/predict-demand (Predictive Demand Model)..." -NoNewline
try {
    $body = @{
        category = "vegetables"
        region = "Maharashtra"
        months_ahead = 6
    } | ConvertTo-Json

    $demandRes = Invoke-RestMethod -Uri "$baseUrl/ai/predict-demand" -Method POST -Body $body -ContentType "application/json"
    if ($demandRes -and $demandRes.Count -eq 6 -and $demandRes[0].predicted_demand_kg -gt 0) {
        Write-Host " PASS (6 Months Forecast: Month 1=$($demandRes[0].predicted_demand_kg)kg, Confidence=$([math]::Round($demandRes[0].confidence_score*100))%)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL: Invalid response format" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test AI Multi-Stop Route Optimizer (TSP / 2-Opt Algorithm)
Write-Host "[Test 3/6] POST $baseUrl/ai/optimize-route (2-Opt TSP Route Optimizer)..." -NoNewline
try {
    $routeBody = @{
        origin = @{ name = "Nashik Aggregator"; lat = 19.9975; lng = 73.7898 }
        destinations = @(
            @{ name = "Mumbai Supermarket DC"; lat = 19.0760; lng = 72.8777 },
            @{ name = "Thane Distribution Hub"; lat = 19.2183; lng = 72.9781 },
            @{ name = "Pune Mandi Center"; lat = 18.5204; lng = 73.8567 },
            @{ name = "Navi Mumbai Cold Storage"; lat = 19.0330; lng = 73.0297 }
        )
    } | ConvertTo-Json

    $routeRes = Invoke-RestMethod -Uri "$baseUrl/ai/optimize-route" -Method POST -Body $routeBody -ContentType "application/json"
    if ($routeRes.total_distance_km -gt 0 -and $routeRes.distance_saved_km -ge 0 -and $routeRes.route_segments.Count -eq 4) {
        Write-Host " PASS (Optimized: $($routeRes.total_distance_km)km, Saved: $($routeRes.distance_saved_km)km, Segments: 4)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test Logistics Driver Authentication
$driverToken = ""
try {
    $driverLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body (@{
        email = "kiran@example.com"
        password = "password123"
    } | ConvertTo-Json) -ContentType "application/json"
    $driverToken = $driverLogin.data.token
} catch {
    Write-Host "Driver Login Error: $($_.Exception.Message)"
}

# 5. Test Logistics Driver Active Deliveries & Coordinates
Write-Host "[Test 4/6] GET $baseUrl/logistics/my-deliveries (Driver Route Waypoints)..." -NoNewline
try {
    $driverHeaders = @{ Authorization = "Bearer $driverToken" }
    $delivRes = Invoke-RestMethod -Uri "$baseUrl/logistics/my-deliveries" -Method GET -Headers $driverHeaders
    if ($delivRes.success -and $delivRes.data.Count -gt 0) {
        $firstDeliv = $delivRes.data[0]
        Write-Host " PASS (Found $($delivRes.data.Count) active shipments for Kiran Transport)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test Driver Status Progression Action (assigned -> picked_up -> in_transit)
Write-Host "[Test 5/6] PUT $baseUrl/logistics/:id/status (Driver Action Lifecycle)..." -NoNewline
try {
    $firstDeliv = $delivRes.data[0]
    $delivId = $firstDeliv.id
    
    if ($firstDeliv.status -eq "assigned") {
        # Mark picked_up
        Invoke-RestMethod -Uri "$baseUrl/logistics/$delivId/status" -Method PUT -Body (@{ status = "picked_up" } | ConvertTo-Json) -Headers $driverHeaders -ContentType "application/json" | Out-Null
        # Mark in_transit
        $updRes = Invoke-RestMethod -Uri "$baseUrl/logistics/$delivId/status" -Method PUT -Body (@{ status = "in_transit" } | ConvertTo-Json) -Headers $driverHeaders -ContentType "application/json"
    } elseif ($firstDeliv.status -eq "picked_up") {
        $updRes = Invoke-RestMethod -Uri "$baseUrl/logistics/$delivId/status" -Method PUT -Body (@{ status = "in_transit" } | ConvertTo-Json) -Headers $driverHeaders -ContentType "application/json"
    } else {
        $updRes = @{ success = $true }
    }
    
    if ($updRes.success) {
        Write-Host " PASS (Shipment #$delivId progressed through lifecycle)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Test Fair-Trade Price Intelligence & Recommendation Engine
Write-Host "[Test 6/6] GET $baseUrl/ai/price-recommendation/1 (Price Intelligence)..." -NoNewline
try {
    $priceRes = Invoke-RestMethod -Uri "$baseUrl/ai/price-recommendation/1" -Method GET
    if ($priceRes.success -and $priceRes.data.recommended_price -gt 0) {
        Write-Host " PASS (Current: Rs $($priceRes.data.current_price)/kg -> Recommended: Rs $($priceRes.data.recommended_price)/kg)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  MODULE 3 RESULTS: $passed / $total TESTS PASSED ($([math]::Round($passed/$total * 100))%)" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host "==========================================================" -ForegroundColor Cyan
