from supabase import create_client
import os
from dotenv import load_dotenv
import pandas as pd
from datetime import datetime

load_dotenv(dotenv_path=".env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

# timestamp per versionare
today = datetime.now().strftime("%Y-%m-%d")

# tabelle da estrarre
tables = [
    "profiles",
    "questionnaire_responses",
    "game_sessions",
    "game_events",
    "derived_features",
    "orientation_profiles"
]

def fetch_table(table_name: str) -> pd.DataFrame:
    response = supabase.table(table_name).select("*").execute()
    return pd.DataFrame(response.data)

for table in tables:
    df = fetch_table(table)
    
    # percorso file
    path = f"data/bronze/{table}_{today}.csv"
    
    df.to_csv(path, index=False)
    
    print(f"{table} salvata → {path} | shape: {df.shape}")