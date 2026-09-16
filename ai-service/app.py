import os
import sys
import io
import json

# Windows DLL directory resolver for PyTorch / Torchvision
_dll_cookies = []
if sys.platform == 'win32':
    try:
        import site
        for sp in site.getsitepackages():
            t_lib = os.path.join(sp, 'torch', 'lib')
            if os.path.isdir(t_lib):
                _dll_cookies.append(os.add_dll_directory(t_lib))
    except Exception:
        pass

from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Body, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

from models.demand_forecaster import DemandForecaster
from models.crop_doctor import CropDoctor
from models.route_optimizer import RouteOptimizer
from cron.scheduler import AutoRetrainScheduler

app = FastAPI(
    title="KisanSetu AI & Operations Research Microservice",
    version="2.0.0",
    description="Production AI Microservice powering XGBoost Demand Forecasting, ResNet50 Crop Doctor, and 2-Opt TW-TSP Logistics Optimization."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Production Models
try:
    forecaster = DemandForecaster()
except Exception as e:
    print(f"Error initializing DemandForecaster: {e}")
    forecaster = None

try:
    crop_doctor = CropDoctor()
except Exception as e:
    print(f"Error initializing CropDoctor: {e}")
    crop_doctor = None

try:
    optimizer = RouteOptimizer()
except Exception as e:
    print(f"Error initializing RouteOptimizer: {e}")
    optimizer = None

try:
    scheduler = AutoRetrainScheduler(forecaster) if forecaster else None
    if scheduler:
        scheduler.start()
except Exception as e:
    print(f"Error starting scheduler: {e}")
    scheduler = None

# Pydantic Request Models
class DemandRequest(BaseModel):
    category: Optional[str] = "vegetables"
    region: Optional[str] = "Maharashtra"
    months_ahead: Optional[int] = 3

class RouteOrigin(BaseModel):
    name: Optional[str] = "Origin"
    lat: float
    lng: float

class RouteDestination(BaseModel):
    name: Optional[str] = "Destination"
    lat: float
    lng: float
    demand_kg: Optional[float] = 50.0
    quantity_kg: Optional[float] = 50.0
    perishability_hours: Optional[float] = 24.0

class RouteRequest(BaseModel):
    origin: RouteOrigin
    destinations: List[RouteDestination]
    vehicle_type: Optional[str] = "tata_ace"

class CropDiagnoseBase64Request(BaseModel):
    image: str
    crop: Optional[str] = None

# -----------------------------------------------------------------------------
# 1. SYSTEM HEALTH
# -----------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "KisanSetu-AI-Microservice",
        "models": {
            "demand_forecaster": {
                "loaded": forecaster is not None,
                "version": forecaster.metadata.get("model_version") if forecaster else None,
                "average_r2": forecaster.metadata.get("average_r2") if forecaster else None
            },
            "crop_doctor": {
                "loaded": crop_doctor is not None,
                "architecture": "ResNet50-TransferLearning",
                "classes_count": crop_doctor.num_classes if crop_doctor else 0
            },
            "route_optimizer": {
                "loaded": optimizer is not None,
                "algorithm": "2-Opt TSP with Perishability Time Windows & Vehicle Capacity Constraints"
            },
            "retrain_scheduler": {
                "active": scheduler is not None and scheduler.get_status().get("is_running", False)
            }
        }
    }

# -----------------------------------------------------------------------------
# 2. DEMAND FORECASTING (XGBOOST ON 3+ YEARS AGMARKNET DATA)
# -----------------------------------------------------------------------------
@app.post("/v1/predict-demand")
@app.post("/api/predict-demand")
def predict_demand(req: DemandRequest):
    if not forecaster:
        raise HTTPException(status_code=500, detail="Forecaster model not initialized")

    category = req.category or "vegetables"
    region = req.region or "Maharashtra"
    months = req.months_ahead or 3

    try:
        predictions = forecaster.predict(category, region, months)
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/model-info")
@app.get("/api/model-info")
def get_model_info():
    if not forecaster:
        raise HTTPException(status_code=500, detail="Forecaster model not initialized")
    return {
        "success": True,
        "forecaster_metadata": forecaster.metadata,
        "scheduler_status": scheduler.get_status() if scheduler else None
    }

@app.post("/v1/demand-forecast/retrain")
def trigger_retrain():
    if not forecaster:
        raise HTTPException(status_code=500, detail="Forecaster model not initialized")
    res = forecaster.retrain()
    return {"success": True, "retrain_result": res}

# -----------------------------------------------------------------------------
# 3. CROP DOCTOR AI (RESNET50 TRANSFER LEARNING ON PLANTVILLAGE 38 CLASSES)
# -----------------------------------------------------------------------------
@app.post("/v1/crop-doctor/diagnose")
@app.post("/api/ai/diagnose")
async def diagnose_leaf(
    request: Request,
    file: Optional[UploadFile] = File(None),
    crop: Optional[str] = Form(None)
):
    if not crop_doctor:
        raise HTTPException(status_code=500, detail="Crop Doctor model not initialized")

    try:
        # Check if multipart file was uploaded
        if file is not None:
            contents = await file.read()
            diagnosis = crop_doctor.diagnose(contents, crop)
            return {"success": True, "data": diagnosis}

        # Check if JSON payload with base64 was sent
        body = await request.json()
        image_data = body.get("image") or body.get("image_base64")
        crop_name = body.get("crop") or crop

        if not image_data:
            raise HTTPException(status_code=400, detail="No image file or base64 data provided")

        diagnosis = crop_doctor.diagnose(image_data, crop_name)
        return {"success": True, "data": diagnosis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 4. MULTI-STOP ROUTE OPTIMIZER (2-OPT TSP + PERISHABILITY TIME WINDOWS + CAPACITY)
# -----------------------------------------------------------------------------
@app.post("/v1/route-optimizer/optimize")
@app.post("/api/optimize-route")
def optimize_route(req: RouteRequest):
    if not optimizer:
        raise HTTPException(status_code=500, detail="Route Optimizer not initialized")

    origin_dict = req.origin.dict()
    dest_dicts = [d.dict() for d in req.destinations]
    vehicle = req.vehicle_type or "tata_ace"

    try:
        result = optimizer.optimize(origin_dict, dest_dicts, vehicle_type=vehicle)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 5. FAIR-TRADE PRICE INTELLIGENCE RECOMMENDATION
# -----------------------------------------------------------------------------
@app.get("/v1/price-intelligence/recommendation")
@app.get("/api/price-recommendation")
def price_recommendation(
    commodity: str,
    current_price: float,
    market_price: float,
    msp: float
):
    if current_price < msp:
        recommended_price = msp * 1.05
        recommendation_type = "increase"
        reasoning = f"Current price is below the Minimum Support Price (MSP ?{msp:.2f}). Increasing to ?{recommended_price:.2f} guarantees sustainable farmer remuneration."
    elif current_price > market_price * 1.2:
        recommended_price = market_price * 1.10
        recommendation_type = "decrease"
        reasoning = "Current price exceeds the APMC Mandi average by over 20%. Adjusting slightly ensures high sales velocity while retaining a premium."
    elif current_price < market_price * 0.9:
        recommended_price = market_price * 0.95
        recommendation_type = "increase"
        reasoning = "Current price is underpriced relative to Mandi arrivals. Adjusting to fair benchmark margin increases farmer profit."
    else:
        recommended_price = current_price
        recommendation_type = "maintain"
        reasoning = "Current price is well-aligned with regional market benchmarks."

    recommended_price = round(recommended_price, 2)

    return {
        "recommended_price": recommended_price,
        "reasoning": reasoning,
        "price_comparison": {
            "current": current_price,
            "market_avg": market_price,
            "msp": msp,
            "recommended": recommended_price
        },
        "recommendation_type": recommendation_type
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=False)
