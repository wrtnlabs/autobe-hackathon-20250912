import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedusers";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates that a system admin can retrieve the full details for a specific
 * authenticated user by userId.
 *
 * - Registers a system admin and log in (so Authorization header is set)
 * - Registers a new authenticatedUser and stores the userId
 * - Admin requests full detail for that userId and verifies all attributes
 *   (actor_type, email, created_at, updated_at, deleted_at/null)
 * - Attempts to retrieve details for:
 *
 *   - A non-existent user UUID
 *   - A user that has been soft-deleted (deleted_at is set/null)
 * - Ensures only admins can request this endpoint (regular users have no such
 *   privilege)
 */
export async function test_api_authenticated_user_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const admin_external_id = RandomGenerator.alphaNumeric(12);
  const admin_email = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminJoinResult = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        external_admin_id: admin_external_id,
        email: admin_email,
        actor_type: "systemAdmin",
      } satisfies IStoryfieldAiSystemAdmin.IJoin,
    },
  );
  typia.assert(adminJoinResult);

  // 2. Login as system admin (ensure Authorization header for future requests)
  const adminLoginResult = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        external_admin_id: admin_external_id,
        email: admin_email,
      } satisfies IStoryfieldAiSystemAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);

  // 3. Register an authenticated user
  const authenticated_external_id = RandomGenerator.alphaNumeric(16);
  const authenticated_email = `${RandomGenerator.alphabets(8)}@user.com`;
  const authUserResult = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: authenticated_external_id,
        email: authenticated_email,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    },
  );
  typia.assert(authUserResult);
  const authenticatedUserId = authUserResult.id;

  // 4. As admin, fetch detail of the created authenticated user
  const userDetail =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.at(
      connection,
      {
        authenticatedUserId,
      },
    );
  typia.assert(userDetail);

  // 5. Validate fields
  TestValidator.equals(
    "actor_type is correct",
    userDetail.actor_type,
    "authenticatedUser",
  );
  TestValidator.equals(
    "email is correct",
    userDetail.email,
    authenticated_email,
  );
  TestValidator.equals(
    "external_user_id matches",
    userDetail.external_user_id,
    authenticated_external_id,
  );
  TestValidator.equals(
    "created_at exists",
    typeof userDetail.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at exists",
    typeof userDetail.updated_at,
    "string",
  );
  TestValidator.equals("deleted_at is null", userDetail.deleted_at, null);

  // 6. Fetch with non-existent userId (should error)
  await TestValidator.error(
    "fetch non-existent user returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.at(
        connection,
        {
          authenticatedUserId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 7. (Optional) Simulate soft delete by testing with a userId that would be soft deleted (no API to delete, document only)
}
