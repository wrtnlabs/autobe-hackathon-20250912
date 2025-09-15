import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Test: System admin can fetch details of a user authentication record by id,
 * never exposing credential hashes, and RBAC/error handling works as expected
 *
 * 1. Register a system admin via /auth/systemAdmin/join (get profile and token)
 * 2. Log in as system admin (explicit login)
 * 3. With system admin token, fetch their user authentication record using
 *    /healthcarePlatform/systemAdmin/userAuthentications/{userAuthenticationId}
 *    (the record for their own login)
 * 4. Assert response includes expected provider, user_type, provider_key, etc, but
 *    does NOT reveal password_hash
 * 5. Negative test: fetch random/non-existent user authentication id (should
 *    error)
 * 6. Negative test: try to fetch record using unauthenticated connection (should
 *    error)
 */
export async function test_api_user_authentication_detail_by_id_success_and_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const email = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: email,
    password: RandomGenerator.alphabets(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Log in as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinResult.email,
      provider: "local",
      provider_key: joinResult.email,
      password: joinInput.password!,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Fetch system admin's user authentication record by id
  // By design, system admin's authentication record id here is the admin's user id (from join result)
  const authId = joinResult.id as string & tags.Format<"uuid">;
  const authDetail =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.at(
      connection,
      {
        userAuthenticationId: authId,
      },
    );
  typia.assert(authDetail);
  // Assert: password_hash must be null or undefined, never a value (security sensitive)
  TestValidator.predicate(
    "system admin authentication password_hash must not be exposed",
    authDetail.password_hash === null || authDetail.password_hash === undefined,
  );
  // Assert: provider, user_type, user_id, and provider_key correctness
  TestValidator.equals(
    "provider matches",
    authDetail.provider,
    joinInput.provider,
  );
  TestValidator.equals(
    "user type is systemadmin",
    authDetail.user_type,
    "systemadmin",
  );
  TestValidator.equals(
    "user id matches system admin id",
    authDetail.user_id,
    joinResult.id,
  );
  TestValidator.equals(
    "provider_key matches",
    authDetail.provider_key,
    joinInput.provider_key,
  );

  // 4. Negative: Fetching random/non-existent authentication id should throw
  await TestValidator.error(
    "fetching non-existent authentication id throws",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.at(
        connection,
        {
          userAuthenticationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Negative: Fetching with unauthenticated connection (not logged in as system admin)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch authentication detail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.at(
        unauthConnection,
        {
          userAuthenticationId: authId,
        },
      );
    },
  );
}
