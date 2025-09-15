import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAccessLog";

/**
 * Validate that an organization admin can search and filter access logs for
 * their assigned organization only, and receives only organization-scoped
 * logs.
 *
 * 1. Register a new organization admin (join)
 * 2. Login as the new admin to get valid authentication tokens
 * 3. Search access logs by issuing PATCH
 *    /healthcarePlatform/organizationAdmin/accessLogs with filter for
 *    organization id
 * 4. Check response structure: must match
 *    IPageIHealthcarePlatformAccessLog.ISummary and only logs for that
 *    organization are returned with proper pagination and data structure.
 * 5. Optionally, issue access logs search a second time (to validate audit
 *    mechanism), but since accessLog generation isn't available from public
 *    API, only search/recording can be inferred by presence of admin's own
 *    search event if available.
 */
export async function test_api_access_log_search_org_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(joinResult);

  // 2. Login as the new admin
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminJoinBody.email,
        password: adminJoinBody.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);

  // 3. Search logs, filtered to the admin's own actions (actor = admin user id)
  const searchBody = {
    actor: loginResult.id,
    page: 1,
    limit: 10,
  } satisfies IHealthcarePlatformAccessLog.IRequest;

  const result =
    await api.functional.healthcarePlatform.organizationAdmin.accessLogs.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(result);

  // 4. Validate response structure, check logs and pagination
  TestValidator.predicate(
    "Returned logs are for correct admin",
    result.data.every((log) => log.user_id === loginResult.id),
  );
  TestValidator.predicate(
    "Each access log has organization_id and correct structure",
    result.data.every(
      (log) =>
        typeof log.id === "string" &&
        typeof log.user_id === "string" &&
        typeof log.organization_id === "string" &&
        typeof log.resource_type === "string" &&
        typeof log.created_at === "string",
    ),
  );
  TestValidator.predicate(
    "Pagination structure present",
    typeof result.pagination === "object" &&
      typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
  );
}
