from datetime import datetime, timedelta
import calendar

class InsightsScheduler:
    def __init__(self):
        self.cache = {}
        self.last_generated = {}
        
    def get_anchor_windows(self) -> dict:
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        
        # Monthly calculations
        first_day_month = today.replace(day=1)
        m_month = today.month + 3
        m_year = today.year
        if m_month > 12:
            m_month -= 12
            m_year += 1
        m_last_day = calendar.monthrange(m_year, m_month)[1]
        last_day_3_months = datetime(m_year, m_month, m_last_day)
        
        # Yearly calculations
        first_day_year = today.replace(month=1, day=1)
        last_day_2_years = datetime(today.year + 2, 12, 31)
        
        return {
            "hourly": {
                "start": today.strftime("%Y-%m-%d"),
                "end": tomorrow.strftime("%Y-%m-%d"),
                "label": "Next 24 hours"
            },
            "monthly": {
                "start": first_day_month.strftime("%Y-%m-%d"),
                "end": last_day_3_months.strftime("%Y-%m-%d"),
                "label": "Next 3 months"
            },
            "yearly": {
                "start": first_day_year.strftime("%Y-%m-%d"),
                "end": last_day_2_years.strftime("%Y-%m-%d"),
                "label": "Next 2 years"
            }
        }
        
    def should_refresh(self, horizon: str) -> bool:
        if horizon not in self.last_generated:
            return True
            
        last_gen = self.last_generated[horizon]
        now = datetime.now()
        
        if horizon == "hourly":
            return (now - last_gen) > timedelta(hours=1)
        elif horizon == "monthly":
            return (now - last_gen) > timedelta(hours=24)
        elif horizon == "yearly":
            return (now - last_gen) > timedelta(days=7)
            
        return True
        
    def get_cached(self, horizon: str):
        return self.cache.get(horizon, None)
        
    def store(self, horizon: str, result: dict):
        self.cache[horizon] = result
        self.last_generated[horizon] = datetime.now()

# Instantiate one global scheduler at module level
scheduler = InsightsScheduler()
