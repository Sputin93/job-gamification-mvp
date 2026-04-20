import pandas as pd
import os

df = pd.read_csv("data/silver/master_with_questionnaire.csv")

print("INPUT SHAPE:", df.shape)

# filtro minimo: target_role presente
df_clean = df.dropna(subset=["target_role"]).copy()

# se vuoi anche il consenso, decommenta questa riga:
# df_clean = df_clean[df_clean["research_consent_given"] == True].copy()

print("CLEAN SHAPE:", df_clean.shape)

print("\nDistribuzione target_role:")
print(df_clean["target_role"].value_counts(dropna=False))

print("\nCon job satisfaction:")
print(df_clean["job_satisfaction"].notna().sum())

os.makedirs("data/silver", exist_ok=True)
df_clean.to_csv("data/silver/master_clean.csv", index=False)

print("\nSalvato: data/silver/master_clean.csv")