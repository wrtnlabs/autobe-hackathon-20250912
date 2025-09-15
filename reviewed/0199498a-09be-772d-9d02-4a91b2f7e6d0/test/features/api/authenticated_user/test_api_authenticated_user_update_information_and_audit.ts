import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedusers";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates the system administrator's ability to update profile information of
 * an authenticated user, including audit and error paths.
 *
 * 1. Register a new system admin account for privileged context
 * 2. Login as system admin to obtain authorization/session
 * 3. Register a new authenticated user and capture their id
 * 4. As system admin, update the user's email and verify audit trail fields
 *    changed
 * 5. Validate email/actor_type updated and updated_at differs from created_at
 * 6. Attempt update using a duplicate email to assert uniqueness constraint error
 * 7. Attempt update of a random/non-existent user (404 error)
 * 8. Attempt update with insufficient permission (simulate unauthenticated call)
 */
export async function test_api_authenticated_user_update_information_and_audit(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const externalAdminId = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. System admin login
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Register a new authenticated user
  const authUserEmail = typia.random<string & tags.Format<"email">>();
  const externalUserId = RandomGenerator.alphaNumeric(16);
  const userJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: externalUserId,
        email: authUserEmail,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    },
  );
  typia.assert(userJoin);
  const authenticatedUserId = typia.assert<string & tags.Format<"uuid">>(
    userJoin.id,
  );

  // 4. Update user email and/or actor_type as system admin
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateBody = {
    email: newEmail,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedusers.IUpdate;
  const updateResult =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.update(
      connection,
      {
        authenticatedUserId,
        body: updateBody,
      },
    );
  typia.assert(updateResult);
  TestValidator.equals(
    "updated email should match",
    updateResult.email,
    newEmail,
  );
  TestValidator.equals(
    "actor_type remains authenticatedUser",
    updateResult.actor_type,
    "authenticatedUser",
  );
  TestValidator.notEquals(
    "updated_at must change from created_at",
    updateResult.updated_at,
    updateResult.created_at,
  );

  // 5. Attempt duplicate email (should error)
  await TestValidator.error("update fails with duplicate email", async () => {
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.update(
      connection,
      {
        authenticatedUserId,
        body: {
          email: adminEmail,
        } satisfies IStoryfieldAiAuthenticatedusers.IUpdate,
      },
    );
  });

  // 6. Attempt to update non-existent user id (should error)
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("update fails for non-existent user", async () => {
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.update(
      connection,
      {
        authenticatedUserId: randomUserId,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IStoryfieldAiAuthenticatedusers.IUpdate,
      },
    );
  });

  // 7. Permission error check - try update without admin (simulate non-admin session)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "insufficient permission to update user",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.update(
        unauthConn,
        {
          authenticatedUserId,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IStoryfieldAiAuthenticatedusers.IUpdate,
        },
      );
    },
  );
}
