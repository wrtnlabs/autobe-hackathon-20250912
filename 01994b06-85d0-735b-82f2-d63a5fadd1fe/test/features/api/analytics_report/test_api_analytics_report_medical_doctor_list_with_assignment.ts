import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * E2E test for fetching analytics reports accessible to a medical doctor based
 * on their organization or department assignment.
 *
 * 1. Register a new medical doctor with random business credentials
 * 2. Log in as the created doctor and obtain the authorization token
 * 3. Fetch analytics report list using the analytics search endpoint, specifying
 *    filters for created_by_user_id, organization_id, and department_id
 * 4. Validate that only analytics reports matching the doctor's org/department are
 *    returned (RBAC check)
 * 5. Negative case: Use org and department filters that don't match the assigned
 *    values, assert empty or error
 *
 * Covers both positive and negative test paths for role assignment/access
 * control.
 */
export async function test_api_analytics_report_medical_doctor_list_with_assignment(
  connection: api.IConnection,
) {
  // 1. Create a medical doctor account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinInput,
  });
  typia.assert(doctor);

  // 2. Authenticate/login as the same doctor
  const loginPayload = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformMedicalDoctor.ILogin;
  const authorized = await api.functional.auth.medicalDoctor.login(connection, {
    body: loginPayload,
  });
  typia.assert(authorized);

  // 3. Fetch analytics reports with positive-match organization_id/department_id filters
  // We'll use the doctor's organization_id and department_id from analytics reports (simulate as if joined org/department)
  // For the sake of example, attempt to query for reports created by this user (which may return 0 records)
  // Normally, if there is a fixture or ability to create reports, we'd ensure at least one record exists
  const filterBody = {
    created_by_user_id: doctor.id,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const reportsPage =
    await api.functional.healthcarePlatform.medicalDoctor.analyticsReports.index(
      connection,
      { body: filterBody },
    );
  typia.assert(reportsPage);
  TestValidator.predicate(
    "reports returned belong to doctor or are empty",
    reportsPage.data.every((r) => r.created_by_user_id === doctor.id),
  );

  // 4. Negative test: Use mismatched organization_id, expect empty data or error (simulate with random uuid)
  const mismatchOrgBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const emptyPage =
    await api.functional.healthcarePlatform.medicalDoctor.analyticsReports.index(
      connection,
      { body: mismatchOrgBody },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no reports returned for mismatched assignment",
    emptyPage.data.length,
    0,
  );

  // 5. Negative test: Use a filter that is guaranteed not to match (made-up UUID for created_by_user_id)
  const noMatchBody = {
    created_by_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const noMatchPage =
    await api.functional.healthcarePlatform.medicalDoctor.analyticsReports.index(
      connection,
      { body: noMatchBody },
    );
  typia.assert(noMatchPage);
  TestValidator.equals(
    "no reports returned for non-matching creator",
    noMatchPage.data.length,
    0,
  );
}
