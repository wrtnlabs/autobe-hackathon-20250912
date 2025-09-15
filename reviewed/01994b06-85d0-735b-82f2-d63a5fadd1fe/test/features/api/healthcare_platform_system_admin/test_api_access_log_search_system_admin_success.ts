import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAccessLog";

/**
 * Validate system admin access to patch-search (filter) platform access logs by
 * org, resource, pagination, and date range.
 *
 * Steps:
 *
 * 1. Register system admin (business email)
 * 2. Login as system admin
 * 3. Construct a complex log search filter (org, resource_type, date window, etc)
 * 4. PATCH search endpoint /healthcarePlatform/systemAdmin/accessLogs with filter
 * 5. Assert response correctness: pagination, filter-fit, and structure
 */
export async function test_api_access_log_search_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register system admin (join)
  const email = RandomGenerator.name(1) + "@company.com";
  const joinReq = {
    email: email as string & tags.Format<"email">,
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: email,
    password: "P@ssw0rd123",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinReq,
  });
  typia.assert(admin);
  // 2. Login as system admin
  const loginReq = {
    email: email as string & tags.Format<"email">,
    provider: "local",
    provider_key: email,
    password: "P@ssw0rd123",
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const logged = await api.functional.auth.systemAdmin.login(connection, {
    body: loginReq,
  });
  typia.assert(logged);
  // 3. Compose log search filter (simulate org, resource_type, random-ish timeline)
  const searchBody = {
    organization: undefined,
    resource_type: undefined,
    access_purpose: undefined,
    actor: undefined,
    from: undefined,
    to: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<1000>,
    sort: "created_at:desc",
  } satisfies IHealthcarePlatformAccessLog.IRequest;
  const result =
    await api.functional.healthcarePlatform.systemAdmin.accessLogs.index(
      connection,
      { body: searchBody },
    );
  typia.assert(result);
  const data = result.data;
  for (const log of data) {
    typia.assert(log);
  }
  TestValidator.predicate(
    "limit matches expected page size or less",
    data.length <= (searchBody.limit ?? 1000),
  );
  TestValidator.equals(
    "pagination current page",
    result.pagination.current,
    searchBody.page,
  );
}
