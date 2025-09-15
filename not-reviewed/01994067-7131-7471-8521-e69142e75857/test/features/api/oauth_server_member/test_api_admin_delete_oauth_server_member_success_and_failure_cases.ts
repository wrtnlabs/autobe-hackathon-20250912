import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

/**
 * This test function validates the deletion of OAuth server member users by
 * an administrator.
 *
 * It ensures that:
 *
 * - Only authorized admins can delete member accounts.
 * - Deletion of non-existent member IDs fails properly.
 * - Unauthorized deletion attempts are rejected.
 * - The delete operation is idempotent and consistent with API specs.
 *
 * Workflow:
 *
 * 1. Admin user authentication with join operation.
 * 2. Create a new OAuth server member account.
 * 3. Successfully delete the created member.
 * 4. Attempt to delete a non-existent member ID to test error handling.
 * 5. Attempt deletion without admin authorization to confirm access control.
 */
export async function test_api_admin_delete_oauth_server_member_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "Password123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a member user to be deleted using an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(
      unauthenticatedConnection,
      {
        body: {
          email: memberEmail,
          password: "MemberPass123!",
        } satisfies IOauthServerMember.ICreate,
      },
    );
  typia.assert(member);

  // 3. Delete the member user as authorized admin
  await api.functional.oauthServer.admin.oauthServerMembers.erase(connection, {
    id: member.id,
  });

  // 4. Attempt deleting a non-existent member ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent member ID should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerMembers.erase(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );

  // 5. Attempt deletion without admin authorization
  // Use the unauthenticated connection created earlier
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerMembers.erase(
        unauthenticatedConnection,
        {
          id: member.id,
        },
      );
    },
  );
}
