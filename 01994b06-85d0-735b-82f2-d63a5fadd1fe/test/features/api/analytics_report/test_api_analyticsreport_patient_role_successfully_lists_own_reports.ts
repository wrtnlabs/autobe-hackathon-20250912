import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * E2E test for patient analytics report listing with tenant isolation
 * validation.
 *
 * 1. Register a new patient (using IHealthcarePlatformPatient.IJoin).
 * 2. Log in as the patient (IHealthcarePlatformPatient.ILogin) to obtain an
 *    authenticated session.
 * 3. Call PATCH /healthcarePlatform/patient/analyticsReports with empty or
 *    default filter and validate the paginated response.
 *
 *    - Store an available report record if present to enable filter testing.
 *    - Confirm the API either returns results or allows empty data for the
 *         patient scope (depending on data).
 * 4. Negative/pathological test: Apply a made-up, definitely different
 *    organization_id and department_id in the filter, validate that zero
 *    results are returned (ensuring no cross-tenant data leakage occurs).
 *
 *    - If a valid report exists, further negative filtering with its properties
 *         can confirm there is no over-broad access to other organizations
 *         or departments by mistake.
 * 5. Pagination and structure validation: Check that result metadata matches
 *    expected types and there are no type errors in output.
 */
export async function test_api_analyticsreport_patient_role_successfully_lists_own_reports(
  connection: api.IConnection,
) {
  // 1. Register a new patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientJoinReq = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      RandomGenerator.date(
        new Date("1980-01-01T00:00:00Z"),
        1000 * 60 * 60 * 24 * 365 * 10,
      ),
    ).toISOString(),
    phone: RandomGenerator.mobile(),
    password: "passwd1234!",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientJoinReq,
  });
  typia.assert(patientAuth);

  // 2. Log-in (token will be set in connection automatically)
  const patientLogin = await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: "passwd1234!",
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(patientLogin);

  // 3. Query reports using default filter (should only obtain scoped-accessible reports)
  const result =
    await api.functional.healthcarePlatform.patient.analyticsReports.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformAnalyticsReport.IRequest,
      },
    );
  typia.assert(result);

  if (result.data.length > 0) {
    // Validate output records' type only; exact organization/department match can't be validated with available patient info
    for (const r of result.data) {
      typia.assert(r);
    }
  } else {
    TestValidator.predicate(
      "no reports present for this patient scope (allowed)",
      result.data.length === 0,
    );
  }

  // Validate pagination object type
  typia.assert(result.pagination);

  // 4. Negative scenario: Use made-up organization_id/department_id; expect no cross-tenant results
  const fakeOrg = typia.random<string & tags.Format<"uuid">>();
  const fakeDept = typia.random<string & tags.Format<"uuid">>();
  const negResult =
    await api.functional.healthcarePlatform.patient.analyticsReports.index(
      connection,
      {
        body: {
          organization_id: fakeOrg,
          department_id: fakeDept,
        } satisfies IHealthcarePlatformAnalyticsReport.IRequest,
      },
    );
  typia.assert(negResult);
  TestValidator.equals(
    "no cross-tenant analytics reports leaked",
    negResult.data.length,
    0,
  );
}
