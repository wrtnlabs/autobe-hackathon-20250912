# User Roles Specification

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