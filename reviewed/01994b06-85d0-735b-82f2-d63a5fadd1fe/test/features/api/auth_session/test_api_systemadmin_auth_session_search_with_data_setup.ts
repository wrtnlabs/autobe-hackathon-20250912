import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuthSession";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuthSession";

/**
 * Test system admin authentication session search (filtered pagination)
 * workflow.
 *
 * 1. Register a system admin (POST /auth/systemAdmin/join)
 * 2. Login as system admin (POST /auth/systemAdmin/login) and get
 *    credentials/token
 * 3. Create a new user authentication record, so a user_id exists (POST
 *    /healthcarePlatform/systemAdmin/userAuthentications)
 * 4. Search sessions with user_id filter (PATCH
 *    /healthcarePlatform/systemAdmin/authSessions) and verify proper result(s)
 * 5. Search with invalid/non-existent user_id (expect empty results)
 * 6. (If feasible) Attempt session search as non-admin (expect error)
 * 7. Validate that search result pagination and structure is correct
 */
export async function test_api_systemadmin_auth_session_search_with_data_setup(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin.email,
      provider: "local",
      provider_key: adminJoinBody.provider_key,
      password: adminJoinBody.password,
    },
  });
  typia.assert(loginResult);

  // 3. Create user authentication record
  const userId = typia.random<string & tags.Format<"uuid">>();
  const userAuthBody = {
    user_id: userId,
    user_type: "simpleuser",
    provider: "local",
    provider_key: RandomGenerator.alphabets(10),
    password_hash: null,
  } satisfies IHealthcarePlatformUserAuthentication.ICreate;
  const userAuth =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
      connection,
      {
        body: userAuthBody,
      },
    );
  typia.assert(userAuth);

  // 4. Search sessions using user_id filter
  const sessionSearchBody = {
    user_id: userAuth.user_id,
    limit: 10,
  } satisfies IHealthcarePlatformAuthSession.IRequest;
  const searchResult =
    await api.functional.healthcarePlatform.systemAdmin.authSessions.index(
      connection,
      { body: sessionSearchBody },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "returned sessions for the user_id (0 or more)",
    Array.isArray(searchResult.data),
  );

  // 5. Search with non-existent user_id
  const invalidUserId = typia.random<string & tags.Format<"uuid">>();
  const noResult =
    await api.functional.healthcarePlatform.systemAdmin.authSessions.index(
      connection,
      {
        body: {
          user_id: invalidUserId,
          limit: 10,
        },
      },
    );
  typia.assert(noResult);
  TestValidator.equals(
    "pagination current page for empty result",
    noResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty data for non-existent user_id",
    noResult.data.length,
    0,
  );

  // 6. Permission error: try search with non-admin (simulate with fake connection, should throw)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot search sessions", async () => {
    await api.functional.healthcarePlatform.systemAdmin.authSessions.index(
      unauthConn,
      {
        body: sessionSearchBody,
      },
    );
  });
}
