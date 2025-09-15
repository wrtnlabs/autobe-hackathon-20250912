import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiSystemPolicy";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";

/**
 * Validate admin search/pagination for system policies and authorization
 * enforcement
 *
 * Steps:
 *
 * 1. Register a new system admin (random credentials)
 * 2. Login as that admin and assert token
 * 3. Query the policy list with a broad filter (expect multiple results, check
 *    pagination fields)
 * 4. Query with field-level filters (policy_code, name, type, active state)
 * 5. Paginate using page/limit and verify expected slicing
 * 6. Attempt access with unauthenticated or non-admin account
 * 7. Negative logic error scenario (out-of-range pagination)
 */
export async function test_api_system_policy_search_pagination_and_role_authorization(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminJoinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 2: Login as admin
  const loginBody = {
    external_admin_id: adminJoinBody.external_admin_id,
    email: adminJoinBody.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(login);
  // token is managed on connection

  // Step 3: Query policy list - broad filter
  const broadResult =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(broadResult);
  TestValidator.predicate(
    "broad query yields at least 1 policy",
    broadResult.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination info available",
    !!broadResult.pagination,
  );

  // Step 4: Query with field filters
  // Policy code filter (assume at least 1 exists from broadResult)
  if (broadResult.data.length > 0) {
    const sample = broadResult.data[0];
    // By policy_code
    const codeFilter =
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
        connection,
        {
          body: { policy_code: sample.policy_code },
        },
      );
    typia.assert(codeFilter);
    TestValidator.predicate(
      "filtered by code returns at least one result",
      codeFilter.data.length >= 1,
    );
    TestValidator.equals(
      "all returned policies match code",
      codeFilter.data.every((p) => p.policy_code === sample.policy_code),
      true,
    );
    // By name
    const nameFilter =
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
        connection,
        {
          body: { name: sample.name },
        },
      );
    typia.assert(nameFilter);
    TestValidator.predicate(
      "filtered by name returns at least one result",
      nameFilter.data.length >= 1,
    );
    TestValidator.equals(
      "at least one name matches",
      nameFilter.data.some((p) => p.name === sample.name),
      true,
    );
    // By type
    const typeFilter =
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
        connection,
        {
          body: { type: sample.type },
        },
      );
    typia.assert(typeFilter);
    TestValidator.predicate(
      "filtered by type returns at least one result",
      typeFilter.data.length >= 1,
    );
    TestValidator.equals(
      "all types match",
      typeFilter.data.every((p) => p.type === sample.type),
      true,
    );
    // By active
    const activeFilter =
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
        connection,
        {
          body: { active: sample.active },
        },
      );
    typia.assert(activeFilter);
    TestValidator.predicate(
      "filtered by active returns at least one result",
      activeFilter.data.length >= 1,
    );
    TestValidator.equals(
      "all results match active flag",
      activeFilter.data.every((p) => p.active === sample.active),
      true,
    );
  }

  // Step 5: Pagination test (page & limit)
  const paginated =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
      connection,
      {
        body: { page: 0, limit: 2 },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "limit respected",
    paginated.data.length,
    Math.min(2, broadResult.data.length),
  );
  TestValidator.equals(
    "pagination current page is 0",
    paginated.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit is 2", paginated.pagination.limit, 2);

  // Step 6: Authorization check for non-admin access (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access denied for non-admin/unauthenticated",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // Step 7: Negative logic error scenario (out-of-range pagination)
  // If there are 0 records and we request page 9999, must return empty result (business validation, not type error)
  const outOfRangePage =
    await api.functional.storyfieldAi.systemAdmin.systemPolicies.index(
      connection,
      {
        body: { page: 9999, limit: 10 },
      },
    );
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "out-of-range page returns empty data",
    outOfRangePage.data.length,
    0,
  );
}
