# Service Overview

The Pay Band System is a decision-support platform designed to transform static, manual compensation analysis into an interactive, data-driven experience for HR teams. This system empowers HR operators to visualize salary distributions against corporate pay bands, dynamically adjust band boundaries, simulate budget impacts, and communicate compensation strategy with clarity—replacing spreadsheets, static charts, and back-and-forth emails with real-time, visual insight.

## Business Objectives

### 1. Increase Pay Equity and Transparency
THE Pay Band System SHALL enable HR operators to visually identify employees whose salaries fall outside predefined pay band ranges, reducing unintended pay disparities by 30% within the first year.

### 2. Accelerate Compensation Planning Cycles
WHEN an HR operator uploads a new compensation dataset, THE Pay Band System SHALL generate a complete pay band visualization in under 5 seconds, reducing time spent on manual charting and analysis from 4–8 hours per cycle to under 15 minutes.

### 3. Improve Budget Forecasting Accuracy
WHEN an HR operator adjusts headcount or average salary in the budget simulation tool, THE Pay Band System SHALL recalculate total compensation cost in real time and display the change as both percentage and absolute value, improving forecast accuracy to within ±5% of actual spend.

### 4. Enhance Cross-Functional Alignment
WHERE the finance team requests compensation cost projections, THE Pay Band System SHALL provide HR with a shareable, visual report that communicates pay structure, headcount impact, and budget risk without technical jargon.

## Target Audience

This system serves two distinct user groups:

- **HR Operators**: Members of the Human Resources team responsible for compensation planning, salary review, and budget forecasting. They upload data, adjust pay bands, and run simulations. This role requires full editing and modification rights.
- **Employee Viewers**: All other employees across the organization who need to understand the company’s compensation framework. They can only view the visualized pay bands and simulation outcomes—never edit or export data. This role ensures transparency without risk of data tampering.

This role separation ensures data integrity while promoting organizational trust.

## Key Features Summary

The system delivers three core capabilities:

1. **Interactive Pay Band Visualization**
   - X-axis: Job Level (ordered from junior to senior)
   - Y-axis: Annual Salary (in currency)
   - Each job level displays a Pay Band as a shaded box with Min, Mid, and Max boundaries
   - Individual salaries appear as short vertical bars inside the band, clearly showing alignment with pay structure

2. **Real-Time Pay Band Adjustment**
   - HR Operators can drag sliders to adjust Min, Mid, and Max values for any pay band group
   - The visualization updates within 300 milliseconds to reflect changes
   - Any salary falling outside the new band boundaries is highlighted to indicate potential misalignment

3. **Dynamic Budget Simulation**
   - HR Operators can simulate changes to:
     - Headcount: ±10% adjustment via numeric input
     - Average Salary: ±20% adjustment via numeric input
   - The system recalculates Budget = Total Headcount × Average Salary (based on uploaded data)
   - Changes are displayed in real time as:
     - Percentage change (e.g., “+7.2%”)
     - Absolute value change (e.g., “+€1,240,000”)

## Document Structure

This document serves as the foundational overview. To implement the system, refer to the following companion documents:

- [User Roles and Access Control](./02-user-roles.md) — Defines what HR Operators and Employee Viewers can and cannot do.
- [Data Upload Specification](./04-data-upload-spec.md) — Details the required columns and format for the .xlsx file upload.
- [Pay Band Structure](./05-pay-band-structure.md) — Explains how pay bands are defined by job family and adjusted annually.
- [Visualization Requirements](./06-visualization-requirements.md) — Specifies how the pay band chart must be rendered.
- [Budget Simulation](./07-budget-simulation.md) — Defines the calculation logic and simulation inputs.
- [User Workflow](./08-user-workflow.md) — Walks through the complete sequence of actions an HR Operator takes.
- [Non-Functional Requirements](./09-non-functional-requirements.md) — Specifies performance, accessibility, and reliability thresholds.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# User Roles and Access Control

## Role Overview

The Pay Band System supports two distinct user roles with clearly defined, non-overlapping responsibilities. These roles are designed to separate data control from information consumption, ensuring security, accountability, and operational efficiency. One role is empowered to manage and adjust compensation data and simulation parameters, while the other is restricted to viewing results only. There are no shared capabilities or ambiguous permission overlaps between these roles.

## HR Operator Responsibilities

HR operators are the only users authorized to initiate, modify, and control the core compensation data and simulation parameters of the Pay Band System. They are responsible for ensuring the accuracy, timeliness, and strategic alignment of compensation planning.

- HR operators SHALL upload compensation data files in .xlsx format to populate the Pay Band visualization.
- HR operators SHALL adjust the Min, Mid, and Max salary values for any Pay Band group using interactive sliders.
- HR operators SHALL simulate changes to total compensation budget by increasing or decreasing headcount and modifying average salary.
- HR operators SHALL review the real-time impact of their adjustments on Pay Band distribution and total budget.
- HR operators SHALL export the current visualization state as PNG or PDF for reporting purposes.
- HR operators SHALL be notified when uploaded data contains missing or invalid values and SHALL correct the file before continuing.

## HR Operator Permissions

HR operators are granted full operational authority over all data inputs and simulation controls. These permissions are defined in business terms and are not limited by interface controls alone.

- WHEN an HR operator accesses the system, THE system SHALL recognize their role and enable all data entry and simulation tools.
- THE system SHALL NOT display any data manipulation controls to users who are not HR operators.
- WHEN a data upload is initiated, THE system SHALL accept the file only if the user has HR operator privileges.
- WHERE a user attempts to adjust a Pay Band slider, THE system SHALL prevent the action if the user is not an HR operator.
- IF a user attempts to modify headcount or average salary in the simulation panel, THEN THE system SHALL deny the request and display a message that only HR operators may adjust these values.
- THE system SHALL ensure that HR operator actions cannot be performed by an Employee Viewer, even if the Employee Viewer attempts to manipulate the interface manually.

## Employee Viewer Responsibilities

Employee viewers are authorized to consume and understand the compensation framework of their organization. Their role is strictly observational, supporting transparency and trust without granting any influence over data or strategy.

- Employee viewers SHALL view the current Pay Band distribution and salary alignment across job levels.
- Employee viewers SHALL view the simulated total compensation budget under different headcount and salary adjustment scenarios.
- Employee viewers SHALL not make any modifications to data, sliders, or simulation inputs.
- Employee viewers SHALL access the system immediately after authentication, without requiring request approval or waiting period.
- Employee viewers SHALL receive visual feedback indicating that their access is limited to viewing only.

## Employee Viewer Permissions

Employee viewers are granted read-only access to all visualization and simulation outputs. No input, adjustment, or export capability is permitted.

- WHEN an employee viewer logs in, THE system SHALL display only the Pay Band visualization and simulated budget results.
- THE system SHALL hide all upload buttons, slider controls, and simulation input fields from employee viewers.
- IF an employee viewer attempts to trigger a form submission or drag a slider, THEN THE system SHALL prevent the action and display a message: "You have read-only access. Only HR operators can modify Pay Band values or run simulations."
- WHERE an employee viewer attempts to export the chart, THEN THE system SHALL disable the export button and not respond to the action.
- THE system SHALL not allow an employee viewer to access or trigger any backend process related to data upload, simulation calculation, or Pay Band adjustment.
- THE system SHALL treat any attempt by an employee viewer to bypass interface restrictions as a security violation.

## Access Control Philosophy

The user access model of the Pay Band System is based on the principle of least privilege: each user is granted only the minimum permissions necessary to fulfill their business function. This model prevents accidental or intentional misuse of sensitive compensation data.

- HR operators and employee viewers SHALL have completely separate access paths within the system.
- There SHALL be no overlap, shared functionality, or role escalation between HR operators and employee viewers.
- The system SHALL ensure that permission boundaries are enforced at the application level, regardless of interface design or client-side manipulation.
- Every action taken by an HR operator SHALL be contextually available only to the HR operator role.
- Every view displayed to an employee viewer SHALL be stripped of any editing, simulation, or data control capability.
- THE system SHALL not rely on client-side visibility alone to restrict access; server-side permission checks SHALL be mandatory for every request that triggers data modification or simulation logic.
- BETWEEN roles, there SHALL be no ability to mimic the permissions of the other.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# Authentication Flow for Pay Band System

The Pay Band System enables two distinct user roles: hrOperator (admin) and employeeViewer (member). Authentication must enforce strict separation of access rights while providing a seamless, secure entry experience. This document defines the complete authentication flow in business language, ensuring developers understand WHAT the system must do — not HOW to build it.


## Authentication Goals

THE Pay Band System SHALL enable secure, role-based access for human resources operators and general employees, ensuring that only authorized users can interact with the system and that each user can only perform actions permitted by their role. The system SHALL prevent unauthorized access to sensitive data or configuration tools, and SHALL automatically terminate inactive sessions to protect compensation information.


## Login Process

WHEN a user visits the Pay Band System, THE system SHALL display a unified login page accepting email and password.

WHEN the user submits valid credentials, THE system SHALL authenticate the user against the central user directory and determine the assigned role (hrOperator or employeeViewer).

WHEN authentication succeeds, THE system SHALL redirect the user to the appropriate home view based on role: HR operators to the data upload and simulation interface, and employees to the read-only visualization dashboard.

WHEN authentication fails due to incorrect email or password, THE system SHALL display a clear message: "Invalid email or password. Please try again."

WHEN authentication fails due to an inactive or disabled account, THE system SHALL display: "Your account is currently inactive. Please contact your HR department."

WHILE the user is unauthenticated, THE system SHALL NOT display any Pay Band data, simulation controls, or upload options.


## Session Management

WHEN a user successfully logs in, THE system SHALL create a secure session and issue a JSON Web Token (JWT).

WHILE the user is active (i.e., making requests or interacting with the interface), THE system SHALL extend the session validity by resetting the inactivity timer.

WHEN the user remains inactive for more than 30 minutes, THE system SHALL automatically terminate the session and clear all session state.

WHEN the user initiates any action after session expiry, THE system SHALL redirect the user to the login page with a message: "Your session has expired. Please log in again."

WHEN a new login occurs for a user who already has an active session, THE system SHALL invalidate the previous session token and issue a new one.


## Token Usage (JWT)

THE Pay Band System SHALL use JSON Web Tokens (JWT) for stateless authentication.

THE JWT payload SHALL contain at minimum:
- userId: unique alphanumeric identifier of the user (e.g., "usr_abc123")
- role: string value matching exactly one of: "hrOperator" or "employeeViewer"

THE JWT SHALL NOT contain:
- Email address
- Password
- Personal identifiers (e.g., social security number)
- Any data not required for role-based access control

THE system SHALL validate each incoming request using the JWT signature and role claim.

WHEN a request contains an invalid or expired JWT, THE system SHALL reject the request with HTTP 401 Unauthorized and clear any client-side session state.

WHEN a request contains a valid JWT but the role does not match the requested action (e.g., employeeViewer attempts to upload data), THE system SHALL reject the request with HTTP 403 Forbidden.


## Logout and Session Expiry

WHEN the user selects "Log Out", THE system SHALL clear the JWT from client storage, terminate the server-side session, and redirect the user to the login page with the message: "You have been logged out successfully."

WHEN the session expires due to inactivity, THE system SHALL behave as if the user manually logged out: all data is cleared, and navigation to protected pages shall redirect to login.

THE system SHALL NOT automatically attempt to refresh a token without user interaction.


## Security Requirements

THE system SHALL require all traffic to use HTTPS.

THE system SHALL reject any request lacking a valid JWT.

THE system SHALL NOT allow JWTs to be passed through URL parameters.

THE system SHALL NOT expose the JWT payload to frontend code in plain text beyond what is necessary for role-based UI rendering (e.g., showing/hiding buttons).

WHERE the user is a hrOperator, THE system SHALL enforce that no simulation or upload functionality is accessible without a validated JWT containing role: "hrOperator".

WHERE the user is an employeeViewer, THE system SHALL enforce that all data displayed is read-only, and no interface controls for modification are rendered or enabled.

IF a JWT is tampered with, modified, or signed with an unauthorized key, THEN THE system SHALL immediately invalidate the token and display an error message to the user: "Your session is no longer valid. Please log in again."

WHILE a session is active, THE system SHALL protect against session riding and CSRF attacks by requiring consistent token usage and validating origin context on sensitive operations such as uploads and simulation triggers.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# Data Upload Specification

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

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# Pay Band Structure

### Pay Band Definition

Pay Bands are predefined salary ranges that correspond to job families and levels within the organization. Each Pay Band represents a structured compensation band that ensures internal equity and external competitiveness. Pay Bands are not tailored to individual roles but are assigned to groups of similar jobs based on responsibilities, required skills, and market benchmarks.

THE Pay Band System SHALL define each Pay Band by three fixed monetary values: Min, Mid, and Max. These values represent the minimum, mid-point, and maximum salary allowable for any position assigned to that Pay Band.

WHEN a job level is assigned to a Pay Band, THE system SHALL enforce that all salaries for positions within that job level remain within the Min and Max boundaries, except in cases of approved exceptions (e.g., exceptional retention or market override).

### Pay Band Grouping by Job Family

Pay Bands are organized by Job Family, which groups similar roles based on functional domain (e.g., Engineering, Sales, Marketing, Operations, Finance).

THE Pay Band System SHALL group Pay Bands exclusively by Job Family, ensuring that all roles within the same Job Family share the same set of Pay Band structures.

WHEN a new role is added to the system, THE system SHALL assign it to a single Job Family, and therefore inherit the Pay Band structure defined for that Job Family.

WHERE multiple job levels exist within a Job Family, THE system SHALL assign a unique Pay Band to each level (e.g., Level 1, Level 2, Level 3), with each level having its own Min, Mid, and Max values.

### Min/Mid/Max Value Logic

The Min, Mid, and Max values for each Pay Band are determined based on market salary surveys, internal pay equity analysis, and organizational compensation philosophy.

THE system SHALL maintain fixed Min, Mid, and Max values for each Pay Band and job level combination.

THE system SHALL define Mid as the 50th percentile of market value for the job level, Min as 80% of Mid, and Max as 120% of Mid.

WHEN a Pay Band is first defined, THE system SHALL calibrate its Min, Mid, and Max values based on the most recent compensation benchmark data available to HR.

IF a position’s salary falls below Min, THE system SHALL flag the position as "Below Pay Band" for HR review.

IF a position’s salary exceeds Max, THE system SHALL flag the position as "Above Pay Band" for HR review.

### Annual Adjustment Process

Pay Band Min/Mid/Max values are not static and are adjusted annually to reflect market changes, inflation, and organizational strategy.

WHEN the fiscal year ends, THE HR Operator SHALL review and propose adjustments to one or more Pay Bands based on external market data, internal pay compression, and budget constraints.

WHEN HR Operator submits proposed Pay Band adjustments, THE system SHALL require approval from the Compensation Committee before applying changes to the live structure.

WHILE Pay Band values are under review or pending approval, THE system SHALL continue to display and use the current approved version for visualization and simulation.

WHERE an adjustment is approved, THE system SHALL archive the old Pay Band values and activate the new values on January 1st of the following year.

### Relationship Between Job Level and Pay Band

Each job level (e.g., Junior, Associate, Senior, Lead, Manager) within a Job Family is mapped to a specific Pay Band.

THE system SHALL ensure a one-to-one mapping between each job level and one Pay Band within its Job Family.

WHEN a job level is promoted or regraded, THE system SHALL reassign the employee automatically to the Pay Band corresponding to the new level.

WHERE an employee's job level does not directly correspond to a known level in the Pay Band hierarchy, THE system SHALL default to the nearest higher or lower Pay Band based on historical usage and compensation policy.

THE Pay Band System SHALL maintain a lookup table that links every job level title (e.g., "Software Engineer I", "Sales Director") to its assigned Pay Band and corresponding Min, Mid, and Max values.

WHEN HR Operator uploads compensation data, THE system SHALL validate each employee’s assigned job level against the active Pay Band structure and alert for any mismatched levels not found in the Pay Band hierarchy.

WHEN a Pay Band is modified, THE system SHALL recalculate all employee positions mapped to that Pay Band and update their position within the visual Pay Band box accordingly.

WHEN an employee's job level is changed, THE system SHALL display their salary movement against both the old and new Pay Band ranges to enable analysis of promotion impact.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# Pay Band Visualization Requirements

This document defines the business-level visualization requirements for the Pay Band System. It specifies exactly how compensation data should be rendered on screen to support HR decision-making through intuitive, real-time feedback. This document is strictly focused on what the visualization must show and how it must respond to user input — not on implementation, libraries, or code structure.

### Visualization Objective

THE Pay Band System SHALL enable HR operators to visually assess the distribution of employee salaries against established Pay Band ranges for each job level. The visualization SHALL provide immediate, accurate, and interpretable feedback so that HR can confidently evaluate compensation alignment, identify outliers, and simulate the impact of adjustments on overall pay equity and budget.

WHEN a user uploads compensation data, THE system SHALL render a visualization that makes it instantly clear whether salaries are below, within, or above defined Pay Band boundaries.

WHILE a user interacts with sliders to adjust Min, Mid, or Max values, THE system SHALL update the visualization in real time to reflect the new Pay Band structure without requiring page reload or manual refresh.

### Axes Definition

THE X-axis SHALL represent job level, ordered from lowest to highest seniority (e.g., Intern → Junior → Mid-Level → Senior → Manager → Director → Executive). Job level SHALL be derived from the "직급" column in the uploaded Excel data.

THE Y-axis SHALL represent annual salary amount in currency units (e.g., KRW, USD), scaled logarithmically if necessary to accommodate wide salary ranges. The scale SHALL be determined automatically based on the minimum and maximum salary values in the uploaded dataset.

### Pay Band Box Representation

FOR EACH job level, THE system SHALL display a vertical Pay Band box that spans from its defined Min to Max salary value, with a horizontal marker at the Mid point.

THE Pay Band box SHALL be drawn as a solid outline rectangle with a light fill (e.g., 10% opacity) to distinguish it from individual salary markers.

THE Mid-point SHALL be indicated with a solid horizontal line across the box, visually separating the lower and upper halves of the Pay Band.

WHEN Pay Band values are adjusted via sliders, THE system SHALL instantaneously move the top (Max), bottom (Min), and middle (Mid) boundary lines of the box to reflect the new values.

IF a Pay Band group does not have defined Min/Mid/Max values for a given job level, THE system SHALL display a placeholder message: "Pay Band not defined for this job level" and render the box as a dashed outline with no fill.

### Individual Salary Display

FOR EACH employee in the uploaded dataset, THE system SHALL display a single short vertical line (1–2 pixels wide) at the precise Y-coordinate corresponding to their annual salary on the respective job level X-position.

THE salary line SHALL be positioned within the boundaries of the Pay Band box for its job level. If the salary falls outside the Pay Band, the line SHALL extend beyond the box boundary.

THE salary lines SHALL be displayed in a neutral color (e.g., dark gray) to ensure clarity without drawing undue attention.

IF an employee's salary exceeds the defined Max value for their job level, THE system SHALL highlight their salary line with a red tint.

IF an employee's salary is below the defined Min value for their job level, THE system SHALL highlight their salary line with a blue tint.

WHEN a user hovers over a salary line, THE system SHALL display a tooltip containing: the employee’s ID, job level, salary amount, and comparison to Pay Band (e.g., "Salary: 78,000,000 KRW | Pay Band: 60M–100M | Below Min").

### Interactive Controls (Sliders)

THE system SHALL provide three interactive sliders for adjusting the Pay Band values: Min, Mid, and Max.

THE Min slider SHALL allow the user to adjust the lower bound of the Pay Band from 0% to 90% of the current Max value.

THE Max slider SHALL allow the user to adjust the upper bound of the Pay Band from 110% of the current Min value to 300% of the current Min value.

THE Mid slider SHALL allow the user to adjust the midpoint value between Min and Max but SHALL NOT allow it to go below Min or above Max.

WHEN any slider is moved, THE system SHALL update the corresponding boundary line in real time and immediately reflect the new Pay Band box in the visualization.

WHEN a user moves a slider, THE system SHALL automatically recalculate the percentage of employees falling within each Pay Band segment:
- Below Min
- Between Min and Mid
- Between Mid and Max
- Above Max

AND SHALL display these percentages in a small summary panel beside the chart.

### Visual Feedback Rules

WHEN the user uploads new compensation data, THE system SHALL clear all previous visualizations and sliders, then render the new dataset and initial Pay Bands.

WHEN sliders are moved, THE system SHALL animate the movement of Min, Mid, and Max lines with a smooth transition lasting 400 milliseconds for perceptual continuity. No transitions SHALL be applied to individual salary lines.

WHEN an employee’s salary crosses a Pay Band boundary due to a slider adjustment, THE system SHALL flash their salary line once in the appropriate highlight color (red/blue) and then revert to default color.

WHERE multiple employees share the same job level and salary, THE system SHALL stack their vertical lines side-by-side (with small horizontal offsets) to ensure all individual markers remain visible.

WHEN a Pay Band box becomes empty (no employees assigned to a job level), THE system SHALL render the box in a light gray with no fill, and display the text "No employees" centered inside the box.

THE visualization SHALL be responsive to window resizing. The chart SHALL maintain its aspect ratio and reflow its elements without loss of clarity when the browser window is resized.

THE system SHALL use only color, position, and shape to convey information — no text or labels shall be embedded directly within the Pay Band box except for the Min, Mid, and Max labels placed briefly to the left of each boundary line.

WHEN a HR operator exports the visualization, THE system SHALL generate a PNG or PDF file that preserves all visual elements (Pay Band boxes, salary lines, labels, and tooltip information in a static format). Only the current view shall be exported.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# Budget Simulation Requirements

### Simulation Purpose

The Pay Band System enables HR operators to simulate the financial impact of compensation adjustments before implementation. This simulation tool supports data-driven decision-making by modeling how changes in headcount or average salary affect total compensation costs. The system does not apply changes to actual payroll data — it provides a safe, interactive environment for forecasting, scenario planning, and budget alignment with organizational goals.

This simulation capability is critical for:
- Evaluating hiring freezes or expansion plans
- Assessing the cost of salary increases during performance cycles
- Aligning compensation strategy with departmental budgets
- Demonstrating ROI of retention initiatives

### Adjustable Parameters

HR operators may simulate compensation changes using two input parameters:

1. **Headcount Change**
   - User may increase or decrease total headcount by up to ±10%
   - Changes are applied proportionally across all job levels
   - Simulated headcount must remain ≥ 1 (minimum one employee)

2. **Average Salary Change**
   - User may increase or decrease average salary by up to ±20%
   - Changes are applied uniformly to all employees in the dataset
   - Salary adjustments do not alter individual Pay Band boundaries or salary distribution

Inputs are provided via dual slider controls in the UI:
- Headcount slider: -10% to +10%, in 1% increments
- Average salary slider: -20% to +20%, in 1% increments

The system shall disable simulation beyond these bounds and shall display a warning message if manual input exceeds these ranges.

### Budget Calculation Formula

THE system SHALL calculate total compensation budget using the following formula:

**Budget = Total Headcount × Average Salary**

Where:
- **Total Headcount** = Number of employees in the uploaded dataset
- **Average Salary** = Sum of all employees' salaries ÷ Total Headcount

THE system SHALL calculate these values directly from the most recently successfully uploaded `.xlsx` file.

WHEN a simulation is initiated, THE system SHALL:
- Multiply the original headcount by (1 + headcount adjustment percentage)
- Multiply the original average salary by (1 + salary adjustment percentage)
- Recalculate budget using the modified values
- Display both the original and simulated budget values for comparison

WHERE headcount adjustment is set to 0%, THEN THE system SHALL use the original headcount from the upload.
WHERE salary adjustment is set to 0%, THEN THE system SHALL use the original average salary calculated from the upload.

### Real-Time Update Requirements

WHEN a user adjusts either the headcount or average salary slider, THE system SHALL:
- Recalculate the simulated budget in real time
- Update the displayed budget value within 300 milliseconds of slider movement
- Display both the absolute value (e.g., ₩5.2B) and percentage change (e.g., +8.7%) relative to the original budget

THE system SHALL not require the user to click a separate ‘Apply’ or ‘Calculate’ button — all changes shall update immediately as the slider is moved.

WHILE the simulation is in progress, THE system SHALL:
- Display the modified headcount and average salary values below the sliders
- Highlight the current budget value with a visual indicator (e.g., bold, color-coded)
- Maintain the original budget reference value for direct comparison

### Display Format for Budget Changes

THE system SHALL display budget change results using the following format:

> **Original Budget**: ₩5,120,000,000
> **Simulated Budget**: ₩5,450,000,000 (+6.4%) 
> - Headcount: 97 (↑3.2%) 
> - Average Salary: ₩56,185,567 (↑3.2%)

THE system SHALL use the local currency symbol (₩) for all displayed values.

WHEN the simulation results exceed the department’s approved budget ceiling (if defined in a future enhancement), THE system SHALL display a warning message: 

> ‘Simulated budget exceeds current departmental ceiling. Review alignment with fiscal plan.’

THE system SHALL NOT display unit costs per employee in the result summary.

THE system SHALL preserve the original budget calculation regardless of simulation input and SHALL always allow the user to reset to original values with one click.

WHEN the user uploads new compensation data, THE system SHALL immediately reset all simulation parameters to 0% and recalculate the original budget based on the new dataset.

WHILE the chart visualization is being updated, THE system SHALL not mutate the underlying uploaded dataset. All simulations are in-memory overlays and do not alter source data.

NOTE: The simulation is a predictive model based on the current dataset. It does not account for bonuses, allowances, recruitment costs, or regional salary differentials. These may be added in future releases.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

# HR Operator Workflow for Pay Band System

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
- Y-axis: Salary amount in KRW (드러너)
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

# Non-Functional Requirements

The Pay Band System must deliver an intuitive, responsive, and reliable experience for HR operators and employee viewers alike. While functional requirements define what the system does, non-functional requirements define how well it does it — under real-world conditions. This document specifies measurable, testable standards for performance, reliability, and accessibility that directly impact user satisfaction and system trustworthiness.

## Performance Expectations

THE Pay Band System SHALL process Excel uploads and render the initial Pay Band visualization within 5 seconds when the file contains up to 100 rows of compensation data. This threshold ensures HR operators do not experience perceptible delays during routine data onboarding, maintaining productivity and workflow continuity.

WHEN an HR operator modifies a Pay Band Min, Mid, or Max value using an interactive slider, THE system SHALL update the visualization and associated budget metrics within 300 milliseconds. This ensures a seamless, real-time feedback loop that supports rapid iterative analysis without lag or disorientation.

WHEN a budget simulation is triggered (e.g., +5% headcount, +10% average salary), THE system SHALL recalculate and display the new budget estimate and distribution impact within 500 milliseconds. This rapid response preserves the cognitive flow of strategic compensation planning and enables confident scenario exploration.

## Data Load Time

WHEN an HR operator uploads an .xlsx file with fewer than 100 rows, THE system SHALL complete validation, parsing, and internal state update within 5 seconds. This requirement ensures data ingestion remains efficient even on moderate network conditions and does not introduce bottlenecks during daily HR operations.

IF the uploaded .xlsx file exceeds 100 rows, THE system SHALL display a warning message informing the user that processing time may increase beyond 5 seconds, but SHALL still process the file to completion. The system SHALL NOT reject or truncate data based on file size alone. This ensures flexibility for larger teams while managing user expectations.

## UI Responsiveness

WHILE an HR operator is dragging a slider to adjust Pay Band Min/Mid/Max values, THE system SHALL throttle updates to no less than 10 frames per second (equivalent to one update every 100 milliseconds). This guarantees fluid, natural interaction even during rapid adjustments, preventing a "jittery" or unresponsive appearance.

WHEN a simulation parameter changes (headcount, average salary), THE system SHALL highlight the changed value and display the new budget result with a visual accent (e.g., color shift or animation) to reinforce causality and improve user comprehension.

## Concurrency Support

THE Pay Band System SHALL support a minimum of 10 concurrent HR operators performing simultaneous actions, including data upload, slider manipulation, and simulation execution. Each user session SHALL be fully isolated — modifications made by one HR operator SHALL NOT affect the data, visualization, or simulation state visible to another user. This ensures secure, independent use in organizational settings with multiple HR teams.

## Data Integrity

IF an uploaded .xlsx file contains invalid or malformed data (e.g., non-numeric salary, missing required column, improper date format), THE system SHALL reject the upload and display a clear, actionable error message listing each specific issue. The system SHALL NOT alter, corrupt, or overwrite existing compensation data already loaded and visualized.

WHILE simulation parameters are being adjusted or a new upload is in progress, THE system SHALL preserve the last valid state of the Pay Band visualization and budget calculation. This allows the user to recover gracefully from failed actions without losing prior work.

IF the system encounters an internal error (e.g., timeout, memory exhaustion) during processing, THE system SHALL revert to the last known safe state and display a generic notification: "An unexpected error occurred. Your last valid configuration has been restored." This prevents state corruption and maintains user trust.

## Browser Compatibility

THE Pay Band System SHALL fully support the latest two versions of the following browsers on desktop platforms:
- Google Chrome
- Microsoft Edge
- Apple Safari

The system SHALL NOT degrade functionality or layout in any of the supported browsers. All visualizations, sliders, and data displays SHALL render correctly and remain fully interactive.

## Accessibility

THE Pay Band System SHALL be fully navigable using keyboard-only input, allowing HR operators to tab through all interactive controls (upload button, sliders, simulation inputs) and activate them using the Enter or Space keys.

WHEN the Pay Band visualization renders, THE system SHALL generate equivalent textual ARIA labels for each job level band, specifying the Min, Mid, Max values and number of employees in each group. This enables screen readers to accurately convey the visualization content to users with visual impairments.

WHENEVER an error message is displayed, THE system SHALL ensure it is programmatically announced by screen readers using an appropriate ARIA live region. This ensures all users, regardless of ability, are aware of system feedback and can respond appropriately.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*