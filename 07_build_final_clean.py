import pandas as pd
import os

df = pd.read_csv("data/silver/master_with_games.csv")

print("INPUT:", df.shape)

# -----------------------------
# BLOCCO QUESTIONARIO / ORIENTATION
# -----------------------------
orientation_cols = [
    "D1", "D2", "D3", "D4", "D5",
    "D6_result", "D6_learning", "D6_relation"
]

# -----------------------------
# BLOCCO GIOCHI (nuove feature bilanciate)
# -----------------------------
game_cols = [
    "triage_decision_quality",
    "triage_strategy_adaptation",
    "triage_decision_speed",
    "gonogo_inhibition_control",
    "gonogo_attention_stability",
    "gonogo_response_stability",
    "neg_interaction_balance",
    "neg_decision_drive",
    "neg_outcome_quality"
]

# -----------------------------
# COLONNE OBBLIGATORIE
# -----------------------------
required_cols = [
    "target_role",
    "job_satisfaction",
    "suggested_role"
] + orientation_cols + game_cols

# -----------------------------
# DATASET FINALE PULITO
# -----------------------------
df_clean = df.dropna(subset=required_cols).copy()

print("\nFINAL CLEAN:", df_clean.shape)

print("\nDistribuzione target_role:")
print(df_clean["target_role"].value_counts())

print("\nDistribuzione suggested_role:")
print(df_clean["suggested_role"].value_counts())

print("\nDistribuzione job_satisfaction:")
print(df_clean["job_satisfaction"].value_counts().sort_index())

print("\nMissing residui:")
print(df_clean[required_cols].isna().sum().sort_values(ascending=False))

# -----------------------------
# SAVE
# -----------------------------
os.makedirs("data/gold", exist_ok=True)
df_clean.to_csv("data/gold/final_dataset_clean.csv", index=False)

print("\nSalvato: data/gold/final_dataset_clean.csv")