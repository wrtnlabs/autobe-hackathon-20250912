## Budget Simulation Requirements

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