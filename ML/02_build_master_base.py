import pandas as pd
import os

# carica bronze
df_profiles = pd.read_csv("data/bronze/profiles_2026-03-27.csv")

print("RAW SHAPE:", df_profiles.shape)
print("COLUMNS:", list(df_profiles.columns))

# base utenti
df_master = df_profiles.copy()

# rinomina chiave utente per uniformità
df_master = df_master.rename(columns={"id": "profile_id"})

# tieni solo colonne utili
cols_to_keep = [
    "profile_id",
    "target_role",
    "research_consent_given",
    "created_at",
    "updated_at"
]

existing_cols = [c for c in cols_to_keep if c in df_master.columns]
df_master = df_master[existing_cols].copy()

print("\nSHAPE dopo selezione colonne:", df_master.shape)

# rimuovi target_role null
df_master = df_master[df_master["target_role"].notna()].copy()

print("SHAPE dopo drop target_role null:", df_master.shape)

# tieni solo i ruoli validi attesi
valid_roles = ["developer", "sales_ops", "receptionist"]
df_master = df_master[df_master["target_role"].isin(valid_roles)].copy()

print("SHAPE dopo filtro ruoli validi:", df_master.shape)

# rimuovi eventuali duplicati su profile_id
df_master = df_master.drop_duplicates(subset=["profile_id"])

print("SHAPE dopo drop duplicati:", df_master.shape)

print("\nDistribuzione target_role:")
print(df_master["target_role"].value_counts())

print("\nUtenti unici:", df_master["profile_id"].nunique())
print("\nMASTER BASE PREVIEW:")
print(df_master.head())

os.makedirs("data/silver", exist_ok=True)
df_master.to_csv("data/silver/master_base.csv", index=False)

print("\nSalvato: data/silver/master_base.csv")