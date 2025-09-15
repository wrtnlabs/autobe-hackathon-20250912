import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPermission";

/**
 * Test advanced system admin permission search/listing and pagination,
 * including edge cases Validates admin join/login, RBAC session, permission
 * filtering (by code, name, scope, status), business rule compliance,
 * pagination (first, next, out-of-range), empty result, invalid filter, and
 * confirms access control enforcement.
 */
export async function test_api_permission_index_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // 2. Admin login
  const adminLoginInput = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth2 = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(adminAuth2);

  // 3. List - default (no filters)
  const noFilterResult =
    await api.functional.healthcarePlatform.systemAdmin.permissions.index(
      connection,
      { body: {} },
    );
  typia.assert(noFilterResult);
  TestValidator.predicate(
    "permission list returns data",
    Array.isArray(noFilterResult.data),
  );
  TestValidator.predicate(
    "pagination structure exists",
    !!noFilterResult.pagination,
  );

  // 4. List - filter by code, scope_type, status, name
  const first = noFilterResult.data[0];
  if (first) {
    const filterFields = [
      { code: first.code },
      { name: first.name },
      { scope_type: first.scope_type },
      { status: first.status },
    ];
    for (const filter of filterFields) {
      const result =
        await api.functional.healthcarePlatform.systemAdmin.permissions.index(
          connection,
          { body: filter },
        );
      typia.assert(result);
      TestValidator.predicate(
        `permissions filtered by ${Object.keys(filter)[0]} returns only matching records`,
        result.data.every((p) => {
          const key = Object.keys(filter)[0] as keyof typeof filter;
          return p[key] === filter[key];
        }),
      );
    }
  }
  // 5. List - partial/invalid filters
  const garbageResult =
    await api.functional.healthcarePlatform.systemAdmin.permissions.index(
      connection,
      { body: { code: "garbage-code-not-exist" } },
    );
  typia.assert(garbageResult);
  TestValidator.equals(
    "empty result for non-existent code",
    garbageResult.data.length,
    0,
  );

  // 6. Pagination - fetch first page
  const pageOne =
    await api.functional.healthcarePlatform.systemAdmin.permissions.index(
      connection,
      { body: { page: 0 as number } },
    );
  typia.assert(pageOne);
  TestValidator.equals(
    "returned page number matches",
    pageOne.pagination.current,
    0,
  );
  // 7. Pagination - fetch next page if possible
  if (pageOne.pagination.pages > 1) {
    const nextPage =
      await api.functional.healthcarePlatform.systemAdmin.permissions.index(
        connection,
        { body: { page: 1 as number } },
      );
    typia.assert(nextPage);
    TestValidator.equals(
      "returned page number is next page",
      nextPage.pagination.current,
      1,
    );
    TestValidator.notEquals(
      "page 1 and 2 have different data (likely)",
      pageOne.data,
      nextPage.data,
    );
  }
  // 8. Out-of-range page
  const emptyPage =
    await api.functional.healthcarePlatform.systemAdmin.permissions.index(
      connection,
      { body: { page: 100000 } },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "out-of-bounds returns empty data",
    emptyPage.data.length,
    0,
  );

  // 9. Invalid/unset/undefined/null filters (status: undefined)
  const statusUndefined =
    await api.functional.healthcarePlatform.systemAdmin.permissions.index(
      connection,
      { body: { status: undefined } },
    );
  typia.assert(statusUndefined);
  TestValidator.equals(
    "status undefined yields same result as no filter",
    statusUndefined.data,
    noFilterResult.data,
  );

  // 10. Confirm RBAC: unauthenticated attempt gets rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Cannot list permissions without admin session",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
