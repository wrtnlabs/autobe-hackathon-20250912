## Pay Band Structure

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