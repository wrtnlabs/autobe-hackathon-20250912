import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDataExportLog";

/**
 * E2E scenario: System admin searches and validates data export logs
 * with/without authorization.
 *
 * Workflow:
 *
 * 1. Register a new healthcare platform system admin account using IJoin
 *    (business email, full_name, phone, provider 'local', provider_key
 *    matches email, password)
 * 2. Login as that system admin via ILogin to get tokens/credentials
 * 3. As the admin, call the export log search PATCH API with a request body
 *    (IRequest) filtering by export_type (e.g., 'EHR_BULK'), status (e.g.,
 *    'COMPLETED'), date range (from_date, to_date), pagination (page 1,
 *    size 2), and sort
 * 4. Assert the page structure
 *    (IPageIHealthcarePlatformDataExportLog.ISummary), verify pagination,
 *    and that all returned records match filter criteria, data masking, and
 *    property set (no sensitive data)
 * 5. Attempt the search as an unauthenticated (or logged-out) session and
 *    confirm access denial
 */
export async function test_api_data_export_logs_search_with_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const email = typia.random<string & tags.Format<"email">>();
  const fullName = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name: fullName,
      phone,
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as admin
  const authed = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(authed);

  // 3. Prepare export log filter (search for type and status, page 1, size 2, and time range)
  const filterBody = {
    export_type: "EHR_BULK",
    status: "COMPLETED",
    from_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    to_date: new Date().toISOString(),
    page: 1 satisfies number,
    size: 2 satisfies number,
    sort: "created_at desc",
  } satisfies IHealthcarePlatformDataExportLog.IRequest;
  // 4. Admin searches logs
  const result =
    await api.functional.healthcarePlatform.systemAdmin.dataExportLogs.index(
      connection,
      { body: filterBody },
    );
  typia.assert(result);
  // Ensure pagination present and record matching (if data)
  TestValidator.predicate(
    "pagination is present",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "records array is defined",
    Array.isArray(result.data),
  );
  // If results, assert each log matches filter
  for (const log of result.data) {
    typia.assert(log);
    if (filterBody.export_type !== undefined)
      TestValidator.equals(
        "log export_type matches",
        log.export_type,
        filterBody.export_type,
      );
    if (filterBody.status !== undefined)
      TestValidator.equals("log status matches", log.status, filterBody.status);
    if (filterBody.from_date !== undefined)
      TestValidator.predicate(
        "log created_at after from_date",
        log.created_at >= filterBody.from_date,
      );
    if (filterBody.to_date !== undefined)
      TestValidator.predicate(
        "log created_at before to_date",
        log.created_at <= filterBody.to_date,
      );
    // No sensitive fields present in log
    TestValidator.predicate(
      "log has no detailed fields",
      typeof (log as any).file_url === "undefined",
    );
  }
  // 5. Unauthorized - remove token, search again and expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.dataExportLogs.index(
      unauthConn,
      { body: filterBody },
    );
  });
}
