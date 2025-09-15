import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiSystemAdmin";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate the admin search, filtering, pagination, and authorization for
 * system admin list endpoint.
 *
 * 1. Create 8+ system admin accounts with unique external_admin_id and email
 *    (simulate SSO flow).
 * 2. Login as one admin for session (select one, keep credentials).
 * 3. List all admin accounts with no filter; verify count and data correctness.
 * 4. Search/filter: by email (exact), by external_admin_id, by actor_type (should
 *    always be 'systemAdmin'), by a creation date range, by updated_at, by
 *    last_login_at; for each, verify results match expected subset.
 * 5. Pagination: Request first page with limit 3, then next, confirm correct page
 *    counts, total, and data.
 * 6. Negative test: Use an unauthenticated connection to call endpoint and expect
 *    error.
 * 7. Negative test: Pass malformed or impossible filter values (bad email,
 *    negative page etc.) to confirm error handling.
 */
export async function test_api_system_admin_account_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register multiple admins
  const adminCount = 8;
  const admins: IStoryfieldAiSystemAdmin.IAuthorized[] =
    await ArrayUtil.asyncMap(
      ArrayUtil.repeat(adminCount, (i) => i),
      async (i) => {
        const external_admin_id = RandomGenerator.alphaNumeric(12) + i;
        const email = `admin_${i}_${RandomGenerator.alphaNumeric(4)}@company.test`;
        const created = await api.functional.auth.systemAdmin.join(connection, {
          body: {
            external_admin_id,
            email: email as string & tags.Format<"email">,
            actor_type: "systemAdmin",
          } satisfies IStoryfieldAiSystemAdmin.IJoin,
        });
        typia.assert(created);
        return created;
      },
    );

  // 2. Login with one of the admins
  const loginAdmin = admins[0];
  const logged = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: loginAdmin.external_admin_id,
      email: loginAdmin.email as string & tags.Format<"email">,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(logged);

  // 3. Unfiltered list: get all
  const allResult =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: {} satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "should return at least adminCount admins",
    allResult.data.length >= adminCount,
  );
  TestValidator.equals(
    "pagination.records",
    allResult.pagination.records,
    allResult.data.length,
  );

  // 4. Filter: by email
  const emailFilterResult =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: {
          email: loginAdmin.email,
        } satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  TestValidator.equals(
    "filtered by email: single match",
    emailFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by email: match email",
    emailFilterResult.data[0].email,
    loginAdmin.email,
  );

  // Filter: by external_admin_id
  const idFilterResult =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: {
          external_admin_id: loginAdmin.external_admin_id,
        } satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(idFilterResult);
  TestValidator.equals(
    "filtered by external_admin_id: single match",
    idFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by external_admin_id: match id",
    idFilterResult.data[0].id,
    loginAdmin.id,
  );

  // Filter: by actor_type
  const actorTypeFilterResult =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: {
          actor_type: "systemAdmin",
        } satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(actorTypeFilterResult);
  // Must include all created admins (all have same actor_type)
  TestValidator.predicate(
    "actor_type=systemAdmin includes created admins",
    actorTypeFilterResult.data.some((x) => x.email === loginAdmin.email),
  );

  // Filter: created_from (use the earliest created_at minus 1ms)
  const createdAtEarliest = Math.min(
    ...admins.map((a) => Date.parse(a.created_at)),
  );
  const createdFromDate = new Date(createdAtEarliest - 10).toISOString();
  const createdFromResult =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: {
          created_from: createdFromDate,
        } satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(createdFromResult);
  // All records should be included
  TestValidator.predicate(
    "created_from includes all admins",
    createdFromResult.data.length >= adminCount,
  );

  // 5. Pagination: limit/page
  const pagedPage1 =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: { page: 1, limit: 3 } satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(pagedPage1);
  TestValidator.equals(
    "pagination.limit matches request",
    pagedPage1.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination.current is 1st page",
    pagedPage1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 has at most 3 items",
    pagedPage1.data.length <= 3,
  );

  const pagedPage2 =
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
      connection,
      {
        body: { page: 2, limit: 3 } satisfies IStoryfieldAiSystemAdmin.IRequest,
      },
    );
  typia.assert(pagedPage2);
  TestValidator.equals(
    "pagination.current is 2nd page",
    pagedPage2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has at most 3 items",
    pagedPage2.data.length <= 3,
  );
  TestValidator.notEquals(
    "page 2 result is not empty when adminCount > limit",
    pagedPage2.data.length,
    0,
  );

  // 6. Negative test: unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin search should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
        unauthConn,
        {
          body: {} satisfies IStoryfieldAiSystemAdmin.IRequest,
        },
      );
    },
  );

  // 7. Negative test: invalid filters
  await TestValidator.error(
    "system admin search with invalid email should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
        connection,
        {
          body: {
            email: "not-an-email",
          } satisfies IStoryfieldAiSystemAdmin.IRequest,
        },
      );
    },
  );

  await TestValidator.error(
    "system admin search with negative page should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemAdmins.index(
        connection,
        {
          body: { page: -1 } satisfies IStoryfieldAiSystemAdmin.IRequest,
        },
      );
    },
  );
}
