import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * End-to-end test for nurse analytics report listing endpoint, covering
 * registration, authentication, role-based data access, and role
 * isolation.
 *
 * This test validates the following business requirements:
 *
 * 1. Nurse registration with all required information.
 * 2. Authentication confirmation immediately after registration (identity and
 *    tokens).
 * 3. Listing analytics reports filtered by nurse-created reports only
 *    (created_by_user_id is the nurse's id).
 * 4. Assure that all returned reports are created by the nurse (no data
 *    leakage across user contexts).
 * 5. Negative test: querying forbidden/random org/department/user IDs (not
 *    belonging to nurse) yields empty report list.
 */
export async function test_api_analytics_report_nurse_list_paginated_and_filtered(
  connection: api.IConnection,
) {
  // 1. Register a nurse
  const nurseEmail = RandomGenerator.name(1) + Date.now() + "@orghospital.com";
  const nurseLicense = RandomGenerator.alphaNumeric(10).toUpperCase();
  const password = RandomGenerator.alphaNumeric(10) + "A";
  const nurseJoinBody = {
    email: nurseEmail,
    full_name: RandomGenerator.name(2),
    license_number: nurseLicense,
    specialty: RandomGenerator.pick(["ICU", "Med/Surg", "Pediatrics", null]),
    phone: RandomGenerator.mobile(),
    password,
  } satisfies IHealthcarePlatformNurse.IJoin;

  const nurseAuth: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, { body: nurseJoinBody });
  typia.assert(nurseAuth);
  TestValidator.equals(
    "nurse email matches join data",
    nurseAuth.email,
    nurseEmail,
  );
  TestValidator.equals(
    "nurse license matches join data",
    nurseAuth.license_number,
    nurseLicense,
  );

  // 2. Login for nurse, check tokens/consistency
  const loginOutput: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.login(connection, {
      body: {
        email: nurseEmail,
        password: password,
      } satisfies IHealthcarePlatformNurse.ILogin,
    });
  typia.assert(loginOutput);
  TestValidator.equals(
    "nurse id matches after login",
    loginOutput.id,
    nurseAuth.id,
  );

  // 3. List analytics reports created by this nurse
  const filterBody = {
    created_by_user_id: nurseAuth.id,
    is_active: true,
    page: 1,
    limit: 20,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const reportPage: IPageIHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.nurse.analyticsReports.index(
      connection,
      {
        body: filterBody,
      },
    );
  typia.assert(reportPage);
  TestValidator.predicate(
    "all reports returned are created by this nurse",
    reportPage.data.every(
      (report) => report.created_by_user_id === nurseAuth.id,
    ),
  );

  // 4. Negative isolation check: Try forbidden filter (random other org/department/user), should yield empty set
  const forbiddenFilterBody = {
    created_by_user_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    is_active: true,
    page: 1,
    limit: 20,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const forbiddenReportPage: IPageIHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.nurse.analyticsReports.index(
      connection,
      {
        body: forbiddenFilterBody,
      },
    );
  typia.assert(forbiddenReportPage);
  TestValidator.equals(
    "forbidden contexts return empty report list",
    forbiddenReportPage.data.length,
    0,
  );
}
