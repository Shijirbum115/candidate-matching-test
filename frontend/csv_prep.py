import pandas as pd

# Load the Excel file
input_file = 'pst_score.xlsx'  
sheet_name = 0  

# Read the necessary columns only
df = pd.read_excel(input_file, sheet_name=sheet_name, usecols='C,G,H', skiprows=6)

# Rename columns for clarity (optional)
df.columns = ['Candidate_registration_ID', 'Exam_Date', 'Exam_Score']

# Save to CSV
output_file = 'filtered_candidates_pst.csv'
df.to_csv(output_file, index=False)

print(f"CSV file saved to {output_file}")
