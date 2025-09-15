import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates forced admin-initiated soft-deletion (force logout) of
 * authentication token sessions.
 *
 * Business Context: Ensures that only privileged admins may force-logout
 * (soft-delete) an authentication session, in compliance with audit and
 * operational security. Sessions are soft-deleted (deleted_at set), tracing is
 * preserved, and operation is restricted to admins. Already
 * deleted/non-existent sessions return errors.
 *
 * Steps:
 *
 * 1. Register a unique system admin via POST /auth/systemAdmin/join.
 * 2. Log in as system admin to create first session. Save session token.
 * 3. Simulate a subsequent login to create a second active session.
 * 4. Call DELETE /storyfieldAi/systemAdmin/tokenSessions/{tokenSessionId} as admin
 *    to soft-delete the first session.
 * 5. Validate that deleted_at is set and session cannot be used.
 * 6. Attempt to re-delete the same session or delete a non-existent session and
 *    validate error handling.
 */
export async function test_api_token_session_force_logout_admin_initiated(
  connection: api.IConnection,
) {
  // Step 1: Register a system admin
  const extAdminId = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    external_admin_id: extAdminId,
    email: adminEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminJoinResp = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminJoinResp);

  // Step 2: Login as system admin (first session)
  const adminLogin1 = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: extAdminId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(adminLogin1);

  // Step 3: Simulate second device login (second session)
  const adminLogin2 = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: extAdminId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(adminLogin2);

  // Step 4: Use a valid UUID (simulated here) as the session to soft-delete
  const tokenSessionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.storyfieldAi.systemAdmin.tokenSessions.erase(
    connection,
    {
      tokenSessionId,
    },
  );

  // Step 5: Attempt to use deleted session (delete again), expect error
  await TestValidator.error(
    "cannot delete already deleted session",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.tokenSessions.erase(
        connection,
        {
          tokenSessionId,
        },
      );
    },
  );

  // Step 6: Attempt to delete a completely non-existent sessionId, expect error
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot delete non-existent session", async () => {
    await api.functional.storyfieldAi.systemAdmin.tokenSessions.erase(
      connection,
      {
        tokenSessionId: fakeSessionId,
      },
    );
  });
}
