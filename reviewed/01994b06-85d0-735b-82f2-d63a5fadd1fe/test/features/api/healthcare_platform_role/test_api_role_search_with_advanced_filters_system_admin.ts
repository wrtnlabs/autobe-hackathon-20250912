import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRole";

/**
 * Validate advanced role search (with filtering, sorting, pagination),
 * negative conditions, and authentication for system admin.
 *
 * Steps:
 *
 * 1. Register a new system admin.
 * 2. Log in as system admin and establish authentication (token handled via
 *    SDK).
 * 3. Perform basic role search without filters - check result is paginated and
 *    valid.
 * 4. Perform search with a real role's code from the result list - check only
 *    one result matches.
 * 5. Filter with status='active' - verify only active roles returned.
 * 6. Filter with status='retired' - verify only retired roles returned.
 * 7. Filter by name (pick partial from one role's name) and check only correct
 *    results returned (by partial match).
 * 8. Filter by scope_type='platform' - check only platform roles returned.
 * 9. Test pagination by specifying limit=1, page=2 - verify correct paging
 *    meta and only second result appears.
 * 10. Negative: search with code and name that won't match any records, expect
 *     zero results.
 * 11. Negative: try searching without authentication - expect error.
 */
export async function test_api_role_search_with_advanced_filters_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Test1234!";
  const full_name = RandomGenerator.name();
  const provider = "local";
  const provider_key = email;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name,
      phone: RandomGenerator.mobile(),
      provider,
      provider_key,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, email);
  TestValidator.equals("admin full name matches", admin.full_name, full_name);

  // 2. Login as system admin (refresh token)
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider,
      provider_key,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Basic unfiltered role search (should succeed)
  const basicPage =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(basicPage);
  TestValidator.predicate("pagination exists", !!basicPage.pagination);
  TestValidator.predicate("role data is array", Array.isArray(basicPage.data));

  // Prepare some sample role properties for tests
  const firstRole = basicPage.data[0];
  if (!firstRole)
    throw new Error("No roles in system - test requires at least 1 role");

  // 4. Filter by code (exact match - should yield one result)
  const byCode =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          code: firstRole.code,
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(byCode);
  TestValidator.predicate(
    "at least one returned for valid code",
    byCode.data.length >= 1,
  );
  for (const role of byCode.data)
    TestValidator.equals("role code matches filter", role.code, firstRole.code);

  // 5. Filter by status='active'
  const byActive =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          status: "active",
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(byActive);
  for (const role of byActive.data)
    TestValidator.equals("status is active", role.status, "active");

  // 6. Filter by status='retired'
  const byRetired =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          status: "retired",
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(byRetired);
  for (const role of byRetired.data)
    TestValidator.equals("status is retired", role.status, "retired");

  // 7. Filter by name (partial)
  const partialName = firstRole.name.substring(
    0,
    Math.max(1, Math.floor(firstRole.name.length / 2)),
  );
  const byName =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          name: partialName,
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(byName);
  for (const role of byName.data)
    TestValidator.predicate(
      "name includes query",
      role.name.includes(partialName),
    );

  // 8. Filter by scope_type='platform'
  const byScopePlatform =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          scope_type: "platform",
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(byScopePlatform);
  for (const role of byScopePlatform.data)
    TestValidator.equals("scope type is platform", role.scope_type, "platform");

  // 9. Pagination: limit=1, page=2. Ensure correct paging and one result
  const byPage =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          limit: 1 as number,
          page: 2 as number,
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(byPage);
  TestValidator.equals("pagination current page", byPage.pagination.current, 2);
  TestValidator.equals("pagination limit 1", byPage.pagination.limit, 1);
  TestValidator.equals("1 result on page", byPage.data.length, 1);

  // 10. Negative: filter yields zero results
  const noResult =
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      connection,
      {
        body: {
          code: "never_exist_code_" + RandomGenerator.alphaNumeric(8),
          name: "zzz_" + RandomGenerator.alphaNumeric(4),
        } satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  typia.assert(noResult);
  TestValidator.equals(
    "zero results for impossible filters",
    noResult.data.length,
    0,
  );

  // 11. Negative: unauthenticated search should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("search without auth fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.roles.index(
      unauthConn,
      {
        body: {} satisfies IHealthcarePlatformRole.IRequest,
      },
    );
  });
}
