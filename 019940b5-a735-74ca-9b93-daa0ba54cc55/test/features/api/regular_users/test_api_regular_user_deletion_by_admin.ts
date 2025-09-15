import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

/**
 * This test validates the process where an admin user deletes a regular user.
 *
 * 1. An admin user is created via /auth/admin/join endpoint with all required
 *    properties included using random valid data.
 * 2. A UUID is generated to represent an existing regular user to be deleted.
 * 3. The admin user uses the DELETE
 *    /eventRegistration/admin/regularUsers/{regularUserId} endpoint to delete
 *    the regular user.
 * 4. The test verifies the deletion call completes without error ensuring admin
 *    authorization and delete success.
 */
export async function test_api_regular_user_deletion_by_admin(
  connection: api.IConnection,
) {
  // Create admin user account
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // Generate a regular user UUID to delete
  const regularUserId = typia.random<string & tags.Format<"uuid">>();

  // Delete the regular user by the admin
  await api.functional.eventRegistration.admin.regularUsers.erase(connection, {
    regularUserId,
  });
}
