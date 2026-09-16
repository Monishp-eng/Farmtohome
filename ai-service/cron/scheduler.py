import os
import logging
from datetime import datetime

logger = logging.getLogger("ai_service.scheduler")

class AutoRetrainScheduler:
    def __init__(self, demand_forecaster):
        self.forecaster = demand_forecaster
        self.scheduler = None
        self.last_run = None
        self.run_count = 0

    def start(self):
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            self.scheduler = BackgroundScheduler()
            self.scheduler.add_job(
                self.retrain_job,
                'interval',
                weeks=1,
                id='weekly_demand_retrain',
                name='Weekly XGBoost Agmarknet Auto-Retrain',
                replace_existing=True
            )
            self.scheduler.start()
            logger.info("Weekly auto-retrain cron job scheduled successfully (every 7 days)")
            print("Weekly auto-retrain cron job scheduled successfully (every 7 days)")
        except Exception as e:
            logger.warning(f"APScheduler init notice: {e}. Falling back to on-demand trigger.")

    def retrain_job(self):
        print(f"[{datetime.now().isoformat()}] Running automated weekly XGBoost model retraining...")
        try:
            result = self.forecaster.retrain()
            self.last_run = datetime.now().isoformat()
            self.run_count += 1
            print(f"Automated retrain complete: Version {result.get('model_version')}, R2: {result.get('average_r2')}")
            return result
        except Exception as err:
            print(f"Automated retrain error: {err}")
            return {"error": str(err)}

    def get_status(self):
        return {
            "cron_interval": "weekly (every 7 days)",
            "last_retrain": self.last_run or self.forecaster.metadata.get('trained_at'),
            "retrain_count": self.run_count,
            "active_model_version": self.forecaster.metadata.get('model_version'),
            "is_running": self.scheduler.running if self.scheduler else False
        }

    def shutdown(self):
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
