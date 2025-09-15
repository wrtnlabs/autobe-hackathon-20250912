import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * End-to-end test for deletion of an authentication session by a system admin.
 *
 * Validates the following business workflow:
 *
 * 1. Register a new system admin via /auth/systemAdmin/join
 * 2. Log in again as system admin for a fresh session via /auth/systemAdmin/login
 * 3. Create a user authentication as system admin via
 *    /healthcarePlatform/systemAdmin/userAuthentications
 * 4. Delete a random auth session by DELETE
 *    /healthcarePlatform/systemAdmin/authSessions/{authSessionId}. This tests
 *    that the API responds (as no actual session management/retrieval endpoints
 *    exist, only format/timing is tested).
 * 5. Attempt deletion with the same random UUID again to trigger error (tests
 *    proper error handling for non-existent session).
 * 6. Attempt deletion with another random/non-existent UUID and verify error.
 *    Skipped: GET confirmation that session is deleted (no API), and forbidden
 *    access from unauthorized session (not possible to simulate).
 */
export async function test_api_systemadmin_auth_session_deletion_success_and_failure(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoinBody = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: "qwerty123!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  typia.assert(sysAdmin);

  // Step 2: Log in again as system admin
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "qwerty123!",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // Step 3: Create a user authentication entry (simulate, using sys admin as user)
  const userAuth =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
      connection,
      {
        body: {
          user_id: sysAdmin.id,
          user_type: "systemadmin",
          provider: "local",
          provider_key: sysAdmin.email,
          password_hash: undefined,
        } satisfies IHealthcarePlatformUserAuthentication.ICreate,
      },
    );
  typia.assert(userAuth);

  // Step 4: Attempt session deletion with a random UUID (simulate active session deletion)
  const testAuthSessionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.healthcarePlatform.systemAdmin.authSessions.erase(
    connection,
    {
      authSessionId: testAuthSessionId,
    },
  );

  // Step 5: Attempt deletion with the same authSessionId (should error)
  await TestValidator.error(
    "Deleting already-deleted/non-existent session should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.authSessions.erase(
        connection,
        {
          authSessionId: testAuthSessionId,
        },
      );
    },
  );

  // Step 6: Attempt deletion with a new random UUID (should error)
  await TestValidator.error(
    "Deletion of completely non-existent session should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.authSessions.erase(
        connection,
        {
          authSessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
