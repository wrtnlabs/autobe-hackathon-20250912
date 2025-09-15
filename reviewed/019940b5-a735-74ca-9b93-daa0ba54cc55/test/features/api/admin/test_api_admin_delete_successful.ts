import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

/**
 * Test successful deletion of an admin user identified by their admin ID.
 *
 * This test performs the following steps:
 *
 * 1. Create and authenticate an admin user with necessary data.
 * 2. Validate the response conforms to IEventRegistrationAdmin.IAuthorized.
 * 3. Extract the newly created admin's ID.
 * 4. Call the deletion endpoint to remove the admin user.
 * 5. Confirm successful deletion via a void response and no errors.
 *
 * This flow validates role-based admin user management and secure cleanup.
 */
export async function test_api_admin_delete_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new admin user
  const newAdminPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const authorizedAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: newAdminPayload,
    });
  typia.assert(authorizedAdmin);

  // 2. Extract adminId
  const adminId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 3. Delete the admin user by adminId
  await api.functional.eventRegistration.admin.admins.eraseAdminUser(
    connection,
    { adminId },
  );
}
