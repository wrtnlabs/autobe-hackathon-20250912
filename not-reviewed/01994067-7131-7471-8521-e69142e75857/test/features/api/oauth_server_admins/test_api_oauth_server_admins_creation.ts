import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";

/**
 * This test validates the creation of an OAuth server admin user account.
 *
 * The scenario follows the complete workflow:
 *
 * 1. Authenticate as admin user via /auth/admin/join to establish admin
 *    context.
 * 2. Using authenticated context, call POST
 *    /oauthServer/admin/oauthServerAdmins to create a new admin user.
 * 3. Provide mandatory fields: unique email address, email_verified flag, and
 *    a password hash string.
 * 4. Assert that the returned admin data matches provided inputs correctly.
 * 5. Validate that audit fields created_at, updated_at are correctly set as
 *    ISO date strings.
 * 6. Attempt to create a second admin user with duplicate email and assert
 *    error occurs.
 *
 * This verifies role-based secured creation and input validation for admin
 * accounts.
 */
export async function test_api_oauth_server_admins_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user via join to get authorization context
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Using authenticated context, create OAuth server admin user
  const newAdminBody: IOauthServerOauthServerAdmins.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IOauthServerOauthServerAdmins.ICreate;

  const createdAdmin =
    await api.functional.oauthServer.admin.oauthServerAdmins.create(
      connection,
      { body: newAdminBody },
    );
  typia.assert(createdAdmin);

  // 3. Assert response fields match input and audit fields exist
  TestValidator.equals(
    "created email matches input",
    createdAdmin.email,
    newAdminBody.email,
  );
  TestValidator.equals(
    "email_verified flag matches input",
    createdAdmin.email_verified,
    newAdminBody.email_verified,
  );
  TestValidator.equals(
    "password_hash matches input",
    createdAdmin.password_hash,
    newAdminBody.password_hash,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdAdmin.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdAdmin.updated_at,
    ),
  );

  // 4. Attempt to create another admin user with duplicate email; expect error
  await TestValidator.error(
    "duplicate email creation should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdmins.create(
        connection,
        {
          body: {
            email: newAdminBody.email,
            email_verified: true,
            password_hash: RandomGenerator.alphaNumeric(64),
          } satisfies IOauthServerOauthServerAdmins.ICreate,
        },
      );
    },
  );
}
