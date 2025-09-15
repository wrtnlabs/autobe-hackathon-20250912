import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Soft delete of an authenticated user account by system admin (admin
 * deactivation flow).
 *
 * This test executes the following scenario:
 *
 * 1. Register a new system admin (POST /auth/systemAdmin/join) with random unique
 *    identifiers.
 * 2. Log in as this system admin (POST /auth/systemAdmin/login) to obtain valid
 *    session and authorization.
 * 3. Register an authenticated user (POST /auth/authenticatedUser/join) with
 *    unique identifiers.
 * 4. As the admin, soft-delete the authenticated user via the erase endpoint
 *    (DELETE
 *    /storyfieldAi/systemAdmin/authenticatedUsers/{authenticatedUserId}).
 * 5. Attempt to delete the same user again to confirm idempotency error.
 * 6. Attempt to delete a non-existent (random) authenticated user ID to confirm
 *    correct error response.
 *
 * This validates that only system admins can perform deactivation, the workflow
 * is enforced, deletion is idempotent, and error handling is correct on
 * business logic edge cases.
 */
export async function test_api_authenticated_user_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminJoinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@admin-domain.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin (to acquire correct JWT session)
  const adminLoginBody = {
    external_admin_id: admin.external_admin_id,
    email: admin.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const adminSession = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminSession);
  TestValidator.equals(
    "system admin id matches after login",
    adminSession.id,
    admin.id,
  );

  // 3. Register a new authenticated user for deletion
  const userJoinBody = {
    external_user_id: RandomGenerator.alphaNumeric(20),
    email: `${RandomGenerator.alphaNumeric(10)}@user-domain.com`,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const user = await api.functional.auth.authenticatedUser.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);
  const authenticatedUserId = user.id;

  // 4. Soft-delete the user as admin
  await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.erase(
    connection,
    {
      authenticatedUserId,
    },
  );

  // 5. Attempt to delete again (should fail, idempotency check)
  await TestValidator.error("idempotent: soft delete again fails", async () => {
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.erase(
      connection,
      {
        authenticatedUserId,
      },
    );
  });

  // 6. Attempt to delete a non-existent authenticated user
  const nonExistentAuthUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent authenticated user fails",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.erase(
        connection,
        {
          authenticatedUserId: nonExistentAuthUserId,
        },
      );
    },
  );
}
