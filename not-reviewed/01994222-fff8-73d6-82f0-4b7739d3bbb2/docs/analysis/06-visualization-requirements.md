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