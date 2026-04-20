import pandas as pd
import ast
import os

# --- LOAD ---
df_master = pd.read_csv("data/silver/master_base.csv")
df_q = pd.read_csv("data/bronze/questionnaire_responses_2026-03-27.csv")

print("MASTER:", df_master.shape)
print("QUESTIONNAIRE:", df_q.shape)

# --- PARSE JSON ---
df_q["responses_dict"] = df_q["responses"].apply(ast.literal_eval)

# --- JOB SATISFACTION (step preferenze) ---
df_pref = df_q[df_q["step"] == "preferenze"].copy()

df_pref["job_satisfaction"] = df_pref["responses_dict"].apply(
    lambda x: x.get("job_satisfaction")
)

df_pref["job_satisfaction"] = pd.to_numeric(df_pref["job_satisfaction"], errors="coerce")

df_pref = df_pref[["profile_id", "job_satisfaction"]].dropna()

# una riga per utente
df_pref = df_pref.drop_duplicates(subset=["profile_id"])

print("\nJOB SAT SHAPE:", df_pref.shape)

# --- MERGE ---
df_master = df_master.merge(df_pref, on="profile_id", how="left")

print("\nAFTER MERGE:", df_master.shape)
print("Con job satisfaction:", df_master["job_satisfaction"].notna().sum())

# --- SAVE ---
os.makedirs("data/silver", exist_ok=True)
df_master.to_csv("data/silver/master_with_questionnaire.csv", index=False)

print("\nSalvato: master_with_questionnaire.csv")