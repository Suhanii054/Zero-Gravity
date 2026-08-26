from agent1_refiner import QueryRefiner
from backend_processor import BackendProcessor
from agent2_generator import AnswerGenerator
import json
import time
from dotenv import load_dotenv

load_dotenv()


class EnergyForecastingSystem:
    def __init__(self, data_path: str = None):
        self.agent1 = QueryRefiner()
        self.processor = BackendProcessor(data_path=data_path)
        self.agent2 = AnswerGenerator()

    def process_query(self, user_query: str, ui_state: dict = None, mode: str = None):
        print(f"--- Processing Query: '{user_query}' ---")
        start_time = time.time()
        
        # New explicit FORECAST branch
        if mode == "FORECAST":
            print("Running FORECAST Mode Pipeline...")
            try:
                # 1. Agent 1
                query_plan = self.agent1.refine(user_query, ui_state)
                # 2. Backend Processor
                context_data = self.processor.run_forecast_mode(query_plan, ui_state)
                # 3. Agent 2
                final_insight = self.agent2.generate_forecast_answer(context_data, user_query)
                # 4. Return to FastAPI
                return { "insight": final_insight, "label": "Forecast Output" }
            except Exception as e:
                print(f"FORECAST Pipeline Failed: {e}")
                return None

        # Original existing flow for other modes
        # Step 1: Agent 1 (Query Refiner)
        print("1. Running Agent 1 (Query Refiner)...")
        try:
            query_plan = self.agent1.refine(user_query, ui_state)
            print(f"   Agent 1 Output (Structured JSON):\n   {query_plan.model_dump_json(indent=2)}")
        except Exception as e:
            print(f"   Agent 1 Failed: {e}")
            return
            
        # Step 2: Backend Processor (Deterministic Python)
        print("\n2. Running Backend Processor...")
        try:
            context_data = self.processor.process(query_plan)
            print(f"   Backend Context Created. Contains {len(context_data.forecast)} forecast points.")
        except Exception as e:
            print(f"   Backend Failed: {e}")
            return
            
        # Step 3: Agent 2 (Answer Generator)
        print("\n3. Running Agent 2 (Answer Generator)...")
        try:
            final_insight = self.agent2.generate(context_data)
        except Exception as e:
            print(f"   Agent 2 Failed: {e}")
            return
            
        end_time = time.time()
        
        print("\n--- FINAL UI OUTPUT ---")
        print(final_insight)
        print(f"-----------------------")
        print(f"Total Execution Time: {end_time - start_time:.2f} seconds")
        
        # Safely serialize outputs
        plan_dump = query_plan.model_dump() if hasattr(query_plan, "model_dump") else (query_plan.dict() if hasattr(query_plan, "dict") else query_plan)
        context_dump = context_data.model_dump() if hasattr(context_data, "model_dump") else (context_data.dict() if hasattr(context_data, "dict") else context_data)
        
        # Ensure a 'label' exists for the API response
        if isinstance(context_dump, dict) and "label" not in context_dump:
            context_dump["label"] = "Forecast Output"

        return {
            "query_plan": plan_dump,
            "backend_context": context_dump,
            "final_insight": final_insight
        }

if __name__ == "__main__":
    # Example Usage
    # NOTE: Set GEMINI_API_KEY and GROQ_API_KEY environment variables before running
    
    system = EnergyForecastingSystem(data_path="Energy Consumption Dataset.xlsx")
    
    sample_queries = [
        "What will be the energy consumption for the next 24 hours?",
        "Did we have any anomalies in the past week?",
        "How is the trend looking for December compared to November?"
    ]
    
    for query in sample_queries:
        system.process_query(query)
        print("\n" + "="*50 + "\n")
