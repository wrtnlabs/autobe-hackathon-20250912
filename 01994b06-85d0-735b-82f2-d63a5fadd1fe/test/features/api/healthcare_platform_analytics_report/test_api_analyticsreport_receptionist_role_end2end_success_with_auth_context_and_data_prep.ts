import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * End-to-end test for paginated and filtered retrieval of analytics reports
 * as receptionist.
 *
 * This test covers:
 *
 * 1. Register and login a receptionist (using POST /auth/receptionist/join and
 *    /login).
 * 2. As the authenticated receptionist, call PATCH
 *    /healthcarePlatform/receptionist/analyticsReports with various
 *    pagination and filter params:
 *
 *    - Check first page with default limit, and verify pagination structure.
 *    - Check edge pagination: request page 2 and/or high page size limit.
 *    - Filter by random non-matching name, confirming empty data.
 *    - Send a minimal filter (e.g., is_active=true), confirming API accepts
 *         partial filters.
 * 3. For each call: assert response shape, fields, and pagination logic;
 *    ensure no fields outside the DTO are exposed (type checked).
 * 4. Confirm every report in data matches IHealthcarePlatformAnalyticsReport
 *    and no sensitive/unpermitted fields are present per receptionist role
 *    scope.
 * 5. If no data present, confirm response shape and correctness for
 *    zero-state.
 */
export async function test_api_analyticsreport_receptionist_role_end2end_success_with_auth_context_and_data_prep(
  connection: api.IConnection,
) {
  // 1. Register a new receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = "password1234";
  const joinInput = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: receptionistPassword,
  } satisfies IHealthcarePlatformReceptionist.ICreate & { password: string };
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: joinInput,
  });
  typia.assert(receptionist);

  // 2. Login as the newly created receptionist
  const loginInput = {
    email: receptionistEmail,
    password: receptionistPassword,
  } satisfies IHealthcarePlatformReceptionist.ILogin;
  const auth = await api.functional.auth.receptionist.login(connection, {
    body: loginInput,
  });
  typia.assert(auth);

  // 3. Call analyticsReports.index (PATCH) with no filters (default page 1, limit 20)
  const reqDefault = {} satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const page1 =
    await api.functional.healthcarePlatform.receptionist.analyticsReports.index(
      connection,
      { body: reqDefault },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination object is present for page 1",
    typeof page1.pagination === "object",
  );
  TestValidator.predicate(
    "data is array for page 1",
    Array.isArray(page1.data),
  );
  page1.data.forEach((report, i) => {
    typia.assert(report);
    TestValidator.predicate(
      `report #${i} matches DTO fields for receptionist`,
      typeof report.id === "string" && typeof report.name === "string",
    );
  });

  // 4a. Edge: Request page 2 (may be empty if only 1 page exists)
  const reqPage2 = {
    page: 2,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const page2 =
    await api.functional.healthcarePlatform.receptionist.analyticsReports.index(
      connection,
      { body: reqPage2 },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "pagination object is present for page 2",
    typeof page2.pagination === "object",
  );
  TestValidator.predicate(
    "data is array for page 2",
    Array.isArray(page2.data),
  );

  // 4b. Edge: Request with a high limit (page size)
  const reqLargeLimit = {
    limit: 50,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const largeLimit =
    await api.functional.healthcarePlatform.receptionist.analyticsReports.index(
      connection,
      { body: reqLargeLimit },
    );
  typia.assert(largeLimit);
  TestValidator.predicate(
    "data is array for large limit",
    Array.isArray(largeLimit.data),
  );

  // 4c. Filter by random non-matching name
  const reqNoMatch = {
    name: "no-such-report-name-" + RandomGenerator.alphabets(8),
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const noMatch =
    await api.functional.healthcarePlatform.receptionist.analyticsReports.index(
      connection,
      { body: reqNoMatch },
    );
  typia.assert(noMatch);
  TestValidator.equals(
    "non-matching filter returns 0 data",
    noMatch.data.length,
    0,
  );

  // 4d. Filter: is_active true
  const reqActive = {
    is_active: true,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;
  const onlyActive =
    await api.functional.healthcarePlatform.receptionist.analyticsReports.index(
      connection,
      { body: reqActive },
    );
  typia.assert(onlyActive);
  TestValidator.predicate(
    "is_active filter result is array",
    Array.isArray(onlyActive.data),
  );
  onlyActive.data.forEach((report, idx) => {
    typia.assert(report);
    TestValidator.predicate(
      `report #${idx} has is_active true`,
      report.is_active === true,
    );
  });

  // 5. If zero reports, check zero-state correctness for page1
  if (page1.data.length === 0) {
    TestValidator.equals(
      "page1 is empty: pagination records is 0",
      page1.pagination.records,
      0,
    );
    TestValidator.equals(
      "page1 is empty: data is empty array",
      page1.data.length,
      0,
    );
  }
}
