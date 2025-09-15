## HR Operator Workflow for Pay Band System

The Pay Band System enables HR operators to dynamically analyze and simulate compensation structures based on uploaded employee data. This document defines the complete sequence of user actions and system responses that shape the operational workflow. The flow is linear and gated — users cannot proceed to downstream functions without completing upstream steps. This ensures data integrity, usability, and predictable system behavior.

### HR Operator Starting Point

HR operators begin their session on the Pay Band System dashboard. The interface displays a prominent "Upload Compensation Data" button and a placeholder visualization area labeled "Data not loaded. Please upload an Excel file to begin." Only the "Upload Compensation Data" button is actionable. All other interactive controls — including sliders, simulation inputs, and export buttons — are disabled and visually grayed out. No visualization or data summary is shown until the user successfully uploads valid compensation data.

### Step 1: Upload Compensation Data

WHEN an HR operator selects the "Upload Compensation Data" button, THE system SHALL display a standard file browser dialog.

WHEN an HR operator selects a file, THE system SHALL validate that:
- The file name ends with .xlsx
- The file contains exactly five columns: 사원ID, 직급, 연봉, 팀, Pay Band
- Every value in the 연봉 column is a positive number (greater than 0)
- Every value in the 사원ID column is non-empty
- Every value in the 직급 and Pay Band columns is non-empty text

IF any validation rule fails, THEN THE system SHALL display a clear, specific error message detailing the failure (e.g., "Column '연봉' contains invalid values. All salaries must be positive numbers.") and return the user to the upload screen with no data loaded.

WHERE the file passes validation, THE system SHALL read and load all data into memory, then automatically proceed to Step 2.

WHILE the upload is processing (typically under 2 seconds), THE system SHALL display a progress spinner next to the upload button with the text "Loading data...".

### Step 2: View Initial Pay Band Visualization

WHEN the system successfully loads compensation data, THE system SHALL generate and display a Pay Band visualization.

THE visualization SHALL show:
- X-axis: Job levels (직급), sorted in ascending order of seniority
- Y-axis: Salary amount in KRW (원)
- For each job level, a horizontal box representing its Pay Band, with three horizontal lines marking Min, Mid, and Max values
- Each employee’s salary as a short, vertical line positioned along the Y-axis within the corresponding job level’s Pay Band box

THE system SHALL sort job levels by a predefined internal hierarchy (e.g., Intern, Associate, Senior, Manager, Director, VP, Executive) and group multiple records with the same 직급 into one bar.

THE system SHALL display total headcount and the overall average salary above the visualization. The Pay Band box colors shall be neutral (e.g., light gray borders), with no highlighting until interaction.

### Step 3: Adjust Min/Mid/Max Using Sliders

WHEN data is successfully loaded, THE system SHALL enable three interactive sliders below the visualization:
- One slider for Min value of the selected Pay Band
- One slider for Mid value of the selected Pay Band
- One slider for Max value of the selected Pay Band

WHEN an HR operator selects a Pay Band group from a dropdown labeled "Select Pay Band Group to Adjust", THE system SHALL populate the sliders with the current Min, Mid, and Max values for that group.

WHILE an HR operator drags a slider, THE system SHALL immediately (within ≤ 300 milliseconds) update the visualization to reflect the new Min, Mid, or Max boundary for the selected Pay Band group. Other Pay Band groups shall remain unchanged.

WHEN a slider value is changed, THE system SHALL display a live counter next to each slider showing the new absolute value in KRW (e.g., "Min: 68,500,000 KRW").

IF an HR operator attempts to set Min > Mid or Mid > Max, THEN THE system SHALL prevent the adjustment, snap the value back to the nearest valid configuration, and display a tooltip: "Min must be ≤ Mid ≤ Max. Adjust values accordingly."

WHEN an HR operator selects a different Pay Band group, THE system SHALL update all three sliders to reflect the values of the newly selected group. The visualization shall instantly repopulate with updated band boundaries for the selected group.

### Step 4: Run Budget Simulation with Inputs

WHEN data is loaded, THE system SHALL enable the "Run Budget Simulation" panel below the sliders.

THE panel SHALL contain:
- A numeric input for "Adjust Headcount" with range [−10% to +10%], default 0%
- A numeric input for "Adjust Average Salary" with range [−20% to +20%], default 0%
- A "Run Simulation" button

WHEN an HR operator enters a value into one of the simulation inputs, THE system SHALL calculate the new budget in real time using the formula:

**New Budget = (Current Headcount × (1 + Headcount Adjustment)) × (Current Average Salary × (1 + Salary Adjustment))**

WHILE the HR operator modifies the inputs, THE system SHALL update the simulation output display immediately:
- Current Budget: [value] KRW
- New Budget: [value] KRW
- Delta: [±value] KRW ([±percentage]%) 

WHEN the "Run Simulation" button is clicked, THE system SHALL overlay the simulation result on the Pay Band visualization:
- Dashed lines shall appear on the Y-axis, showing the new average salary level
- The total headcount and budget numbers shall be displayed in a highlighted box with green (increase) or red (decrease) background
- The unchanged Pay Band boundaries shall remain visible for comparison

WHEN a simulation has been run, THE system SHALL persist the simulation state until the user either uploads new data or explicitly clears the simulation.

### Step 5: Review Combined Impact

WHEN HR operators combine slider adjustments with manual budget simulations, THE system SHALL display all changes simultaneously on the visualization.

THE visualization SHALL show:
- Original Pay Band boundaries (solid lines)
- Modified Pay Band boundaries (dashed lines or highlighted color if changed)
- Actual employee salary distribution
- Simulation-adjusted average salary (dashed horizontal line)

THE system SHALL provide a summary panel labeled "Combined Impact" that lists:
- Pay Band Change: "Min increased by 5%, Max decreased by 3%"
- Headcount Change: "+7%"
- Salary Change: "+12%"
- Total Budget Impact: "+19.3% (₩2.87B)"

THIS panel SHALL update in real time as any input changes. There shall be no delay between user action and feedback.

### Step 6: Save or Export Results

WHEN an HR operator is satisfied with the current state of the visualization and simulation, THE system SHALL enable an "Export as PNG" button and a "Export as PDF" button below the visualization.

WHEN an HR operator clicks either button, THE system SHALL generate a static image of the current visualization, including:
- All Pay Band boundaries (original and modified)
- All employee salary markers
- Simulation summary box
- Axes, labels, and legend
- Any active simulation overlays or percentage deltas

THE system SHALL default to PNG format, but offer PDF as an alternative for printing or formal reporting.

THE exported file SHALL be named: "PayBandAnalysis_[YYYYMMDD]_[HHMMSS].png" or ".pdf"

IF the export fails due to system error, THEN THE system SHALL display: "Export failed. Please refresh and try again."

WHERE export succeeds, THE system SHALL prompt: "File saved to your downloads folder."

NOT: HR operators cannot export until data has been uploaded and at least one adjustment or simulation has been applied. The export buttons shall remain disabled if the system is showing only the initial, unmodified visualization.

------------------------------

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*