The Pay Band System requires users to upload compensation data in a specific Excel (.xlsx) format. The system processes this data to generate dynamic Pay Band visualizations and budget simulations. The structure of the uploaded file is critical to system functionality and must be strictly enforced.

### Upload Format

THE system SHALL accept only .xlsx files for compensation data uploads. All other file formats (including .csv, .xls, .ods, .txt) SHALL be rejected with a clear error message.

### Required Columns

WHEN a user uploads an Excel file, THE system SHALL require exactly five (5) columns with the exact following names, in any order:

- 사원ID
- 직급
- 연봉
- 팀
- Pay Band

IF any of these five columns are missing, THE system SHALL reject the upload and display a specific error message listing the missing column names.

### Data Validation Rules

WHEN the system processes each row of the uploaded Excel file, THE system SHALL validate the following rules:

1. 사원ID: 
   - SHALL be a non-empty string or number
   - SHALL NOT be null or blank
   - SHALL be unique across all uploaded rows (if duplicate, the system SHALL flag the duplicate for review)
   - Optional alphanumeric format: may contain hyphens, underscores, or numbers

2. 직급:
   - SHALL be a non-empty string
   - SHALL NOT be null or blank
   - SHALL be treated as a textual job level designation (e.g., "Manager", "Senior Engineer", "Analyst")

3. 연봉:
   - SHALL be a positive number greater than zero
   - SHALL NOT be zero, negative, null, or blank
   - SHALL be interpretable as a numeric value (e.g., 52000, 75000.50, 98000)
   - SHALL be treated as Korean Won (KRW) without currency symbols
   - IF value is non-numeric or ≤ 0, THE system SHALL reject the entire row and notify user of invalid entry

4. 팀:
   - SHALL be a non-empty string
   - SHALL NOT be null or blank
   - MAY contain alphanumeric characters, spaces, or special symbols (e.g., "Sales - APAC", "R&D/Innovation")

5. Pay Band:
   - SHALL be a non-empty string
   - SHALL NOT be null or blank
   - SHALL reference a pre-defined Pay Band Group name (e.g., "Band B", "Director Level", "Research Tier 3")
   - The system SHALL NOT validate whether the Pay Band name exists in a master list during upload — it shall be treated as a free-text label for later system alignment

All other columns found in the uploaded Excel file SHALL be ignored and not stored or processed.

### Error Handling for Uploads

IF the uploaded file:
- Is not a valid .xlsx format, THEN THE system SHALL display: "Please upload a valid Excel (.xlsx) file."
- Contains fewer than the five required columns, THEN THE system SHALL display: "Upload failed: Missing required columns: [list of missing column names]. Please ensure all required columns are present."
- Contains a null/blank value in 사원ID, 직급, 팀, or Pay Band, THEN THE system SHALL display: "Upload failed: Row [row number] contains missing data in required field [column name]."
- Contains a zero, negative, or non-numeric value in 연봉, THEN THE system SHALL display: "Upload failed: Row [row number] has invalid salary value: [value]. Salary must be a positive number."
- Contains duplicate 사원ID values, THEN THE system SHALL display: "Upload warning: [count] duplicate employee IDs found. The system will use the last occurrence of each duplicate. Review data for accuracy."

WHEN any error occurs, THE system SHALL NOT partially process the file. All rows SHALL be rejected if any row violates validation rules.

### Expected Data Formats

THE system SHALL interpret all fields according to the following format conventions:

| Column | Input Type | Example Valid Values | Example Invalid Values |
|--------|------------|----------------------|------------------------|
| 사원ID | Text/Number | "EMP12345", "12345", "e-9987" | "", "null", "-" |
| 직급 | Text | "Senior Developer", "Team Lead" | "", "  ", "null" |
| 연봉 | Positive Number | 68000, 89500.50 | 0, -10000, "", "N/A" |
| 팀 | Text | "Marketing", "Product - Mobile" | "", "CLUSTER" (if empty) |
| Pay Band | Text | "Band C", "Executive Tier", "Mid-Level" | "", "none", "BANDA" (if blank) |

WHILE any column value is empty, blank, or contains no printable characters, THE system SHALL treat it as invalid and reject the upload.

WHEN the file is successfully validated, THE system SHALL store the data for visualization and simulation and clear any existing previous upload data.

WHERE Pay Band value does not match any system-defined Pay Band Group, THE system SHALL still accept the upload and use the provided text as-is — the matching to official Pay Band Groups HARVESTED during the annual review process. This allows HR to upload provisional or new band names before formal approval.

IF multiple employees from the same 팀 have identical 직급 and 연봉, THE system SHALL still process them as individual records — aggregation is performed at visualization stage, not upload stage.