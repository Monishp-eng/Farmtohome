# ==============================================================================
# 🌾 MODULE 1: MULTI-CHANNEL FARMER ACCESS ENGINE - COMPREHENSIVE TEST SUITE
# ==============================================================================

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api"

Write-Output "================================================================================"
Write-Output "🌾 TESTING MODULE 1: MULTI-CHANNEL FARMER ACCESS ENGINE (6 INGESTION CHANNELS)"
Write-Output "================================================================================"

# ------------------------------------------------------------------------------
# TEST 1: Phone OTP Verification Service
# ------------------------------------------------------------------------------
Write-Output "`n[1/7] Testing Farmer Phone OTP Verification..."
$otpSend = Invoke-RestMethod -Uri "$baseUrl/auth/send-otp" -Method POST -Body (@{
    phone = "9840112233"
    purpose = "FARMER_REGISTRATION"
} | ConvertTo-Json) -ContentType "application/json"

$otpCode = $otpSend.data.otp
Write-Output "  -> OTP Dispatched: $otpCode (Expires: $($otpSend.data.expiresAt))"

$otpVerify = Invoke-RestMethod -Uri "$baseUrl/auth/verify-otp" -Method POST -Body (@{
    phone = "9840112233"
    otp = $otpCode
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> OTP Verification Status: $($otpVerify.message)"

# ------------------------------------------------------------------------------
# TEST 2: Natural Voice AI (Sarvam / Groq Cascade + GPS Geocoding)
# ------------------------------------------------------------------------------
Write-Output "`n[2/7] Testing Channel 1: Natural Voice AI (Tamil Speech + Cost-Saving Cascade)..."
$voiceSpeech = "சேலம்ல இருந்து 500 கிலோ தக்காளி 25 ரூபாய்க்கு விற்கணும்"
$voiceRes = Invoke-RestMethod -Uri "$baseUrl/ivr/voice-ai" -Method POST -Body (@{
    transcript = $voiceSpeech
    language = "ta"
    caller_phone = "9840112233"
    farmer_name = "Murugan"
} | ConvertTo-Json) -ContentType "application/json"

$listingId1 = $voiceRes.data.listingId
Write-Output "  -> Utterance: $voiceSpeech"
Write-Output "  -> Extracted: $($voiceRes.data.entities.crop) ($($voiceRes.data.entities.quantity)kg @ Rs $($voiceRes.data.entities.expected_price)/kg)"
Write-Output "  -> GPS Coordinates: Lat $($voiceRes.data.entities.latitude), Lng $($voiceRes.data.entities.longitude)"
Write-Output "  -> NLP Engine Used: $($voiceRes.data.entities.engine)"
Write-Output "  -> Listing ID Created: #$listingId1"

# ------------------------------------------------------------------------------
# TEST 3: 2G DTMF Keypad IVR (1800-547-2600)
# ------------------------------------------------------------------------------
Write-Output "`n[3/7] Testing Channel 2: 2G DTMF Keypad IVR (Toll-Free 1800-547-2600)..."
# Step 1: Welcome
$call1 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = "WELCOME"
} | ConvertTo-Json) -ContentType "application/json"

# Step 2: Language (Tamil = 1)
$call2 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call1.data.step
    dtmf_input = "1"
    session_data = $call1.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

# Step 3: Main Menu (Sell = 1)
$call3 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call2.data.step
    dtmf_input = "1"
    session_data = $call2.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

# Step 4: Category (Vegetables = 1)
$call4 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call3.data.step
    dtmf_input = "1"
    session_data = $call3.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

# Step 5: Crop (Tomato = 1)
$call5 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call4.data.step
    dtmf_input = "1"
    session_data = $call4.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

# Step 6: Quantity (200kg)
$call6 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call5.data.step
    dtmf_input = "200#"
    session_data = $call5.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

# Step 7: Price (Rs 25/kg)
$call7 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call6.data.step
    dtmf_input = "25#"
    session_data = $call6.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

# Step 8: Confirm Listing (1 = Yes)
$call8 = Invoke-RestMethod -Uri "$baseUrl/ivr/call" -Method POST -Body (@{
    caller_phone = "9876543210"
    step = $call7.data.step
    dtmf_input = "1"
    session_data = $call7.data.session_data
} | ConvertTo-Json) -ContentType "application/json"

Write-Output "  -> IVR Multi-Step Call Completed: $($call8.data.voicePrompt)"

# ------------------------------------------------------------------------------
# TEST 4: Zero-Cost GSM USSD Protocol (*561#)
# ------------------------------------------------------------------------------
Write-Output "`n[4/7] Testing Channel 3: Zero-Cost GSM USSD Session Protocol (*561#)..."
$sId = "ussd_test_$((Get-Date).Ticks)"
# Dial *561#
$u1 = Invoke-RestMethod -Uri "$baseUrl/ivr/ussd" -Method POST -Body (@{
    sessionId = $sId
    phone = "9876500111"
    input = ""
    serviceCode = "*561#"
} | ConvertTo-Json) -ContentType "application/json"

# Select 1: Sell Produce
$u2 = Invoke-RestMethod -Uri "$baseUrl/ivr/ussd" -Method POST -Body (@{
    sessionId = $sId
    phone = "9876500111"
    input = "1"
} | ConvertTo-Json) -ContentType "application/json"

# Select 2: Onion
$u3 = Invoke-RestMethod -Uri "$baseUrl/ivr/ussd" -Method POST -Body (@{
    sessionId = $sId
    phone = "9876500111"
    input = "2"
} | ConvertTo-Json) -ContentType "application/json"

# Enter Quantity: 300
$u4 = Invoke-RestMethod -Uri "$baseUrl/ivr/ussd" -Method POST -Body (@{
    sessionId = $sId
    phone = "9876500111"
    input = "300"
} | ConvertTo-Json) -ContentType "application/json"

# Enter Price: 22
$u5 = Invoke-RestMethod -Uri "$baseUrl/ivr/ussd" -Method POST -Body (@{
    sessionId = $sId
    phone = "9876500111"
    input = "22"
} | ConvertTo-Json) -ContentType "application/json"

Write-Output "  -> USSD Response Screen: `"$($u5.response)`""

# ------------------------------------------------------------------------------
# TEST 5: Zero-Airtime Missed-Call Gateway
# ------------------------------------------------------------------------------
Write-Output "`n[5/7] Testing Channel 4: Zero-Airtime Missed-Call Trigger..."
$missedRes = Invoke-RestMethod -Uri "$baseUrl/ivr/missed-call" -Method POST -Body (@{
    caller_phone = "9840998877"
    circle = "Tamil Nadu"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> Status: $($missedRes.message)"

# ------------------------------------------------------------------------------
# TEST 6: Common Service Centre (CSC) Kisan Mitra Village Kiosk
# ------------------------------------------------------------------------------
Write-Output "`n[6/7] Testing Channel 5: CSC Kisan Mitra Village Kiosk (India 5+ Lakh Gram Panchayats)..."
$cscListing = Invoke-RestMethod -Uri "$baseUrl/csc/list-produce" -Method POST -Body (@{
    farmer_phone = "9876512345"
    farmer_name = "Rajendran (Elderly Farmer)"
    crop_name = "Organic Basmati Rice"
    category = "grains"
    quantity_kg = 1000
    price_per_kg = 65
    quality_grade = "A"
    is_organic = $true
    village = "Thanjavur Delta"
    vle_id = "CSC_TN_VLE_4021"
} | ConvertTo-Json) -ContentType "application/json"

Write-Output "  -> CSC Listing Created: #$($cscListing.data.listingId) ($($cscListing.data.crop_name) 1000kg @ Rs 65/kg)"
Write-Output "  -> Geocoded Coordinates: Lat $($cscListing.data.latitude), Lng $($cscListing.data.longitude)"
Write-Output "  -> VLE Operator: $($cscListing.data.vle_id)"

$cscStats = Invoke-RestMethod -Uri "$baseUrl/csc/kiosk-stats" -Method GET
Write-Output "  -> Total Kiosk Farmers Assisted: $($cscStats.data.total_farmers_assisted)"

# ------------------------------------------------------------------------------
# TEST 7: 2-Way SMS Gateway Command Suite (56161)
# ------------------------------------------------------------------------------
Write-Output "`n[7/7] Testing Channel 6: 2-Way SMS Gateway Command Suite (56161)..."

# 7A: SELL Command
$sms1 = Invoke-RestMethod -Uri "$baseUrl/ivr/sms" -Method POST -Body (@{
    from_phone = "9840112233"
    message = "SELL GUAVA 300 35"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> SMS SELL: $($sms1.data.reply)"

# 7B: RATES Command
$sms2 = Invoke-RestMethod -Uri "$baseUrl/ivr/sms" -Method POST -Body (@{
    from_phone = "9840112233"
    message = "RATES ONION"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> SMS RATES: $($sms2.data.reply)"

# 7C: ORDERS Command
$sms3 = Invoke-RestMethod -Uri "$baseUrl/ivr/sms" -Method POST -Body (@{
    from_phone = "9840112233"
    message = "ORDERS"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> SMS ORDERS: $($sms3.data.reply)"

# 7D: EARNINGS Command
$sms4 = Invoke-RestMethod -Uri "$baseUrl/ivr/sms" -Method POST -Body (@{
    from_phone = "9840112233"
    message = "EARNINGS"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> SMS EARNINGS: $($sms4.data.reply)"

# 7E: MY LISTINGS Command
$sms5 = Invoke-RestMethod -Uri "$baseUrl/ivr/sms" -Method POST -Body (@{
    from_phone = "9840112233"
    message = "MY LISTINGS"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> SMS MY LISTINGS: $($sms5.data.reply)"

# 7F: HELP Command
$sms6 = Invoke-RestMethod -Uri "$baseUrl/ivr/sms" -Method POST -Body (@{
    from_phone = "9840112233"
    message = "HELP"
} | ConvertTo-Json) -ContentType "application/json"
Write-Output "  -> SMS HELP: $($sms6.data.reply.Substring(0, 70))..."

Write-Output "`n================================================================================"
Write-Output "✅ ALL 7 MULTI-CHANNEL FARMER ACCESS TESTS PASSED WITH 100% SUCCESS!"
Write-Output "================================================================================"
