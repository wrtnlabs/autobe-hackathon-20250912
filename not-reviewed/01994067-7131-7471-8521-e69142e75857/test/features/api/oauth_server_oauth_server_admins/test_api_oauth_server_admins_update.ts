import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";

/**
 * This test validates the update functionality of OAuth server admin users. It
 * covers the workflow of creating an authenticated admin user, creating an
 * OAuth server admin user record, updating that record, and validating the
 * updated data.
 *
 * It also tests edge cases such as - invalid IDs, unauthorized update attempts,
 * and validation errors.
 *
 * The scenario enforces business rules requiring the updater to be an
 * authenticated admin.
 */
export async function test_api_oauth_server_admins_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create OAuth server admin user that will be updated
  const oauthAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: false,
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies IOauthServerOauthServerAdmins.ICreate;

  const createdOauthAdmin: IOauthServerOauthServerAdmins =
    await api.functional.oauthServer.admin.oauthServerAdmins.create(
      connection,
      {
        body: oauthAdminCreateBody,
      },
    );
  typia.assert(createdOauthAdmin);

  TestValidator.equals(
    "created admin email matches",
    createdOauthAdmin.email,
    oauthAdminCreateBody.email,
  );
  TestValidator.predicate(
    "created admin email_verified is false",
    createdOauthAdmin.email_verified === false,
  );

  // Prepare updated data
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedEmailVerified = !createdOauthAdmin.email_verified;
  const updatedPasswordHash = RandomGenerator.alphaNumeric(30);
  const updatedDeletedAt = null;

  const oauthAdminUpdateBody = {
    email: updatedEmail,
    email_verified: updatedEmailVerified,
    password_hash: updatedPasswordHash,
    deleted_at: updatedDeletedAt,
  } satisfies IOauthServerOauthServerAdmins.IUpdate;

  // Step 3: Perform update on the created admin user
  const updatedOauthAdmin: IOauthServerOauthServerAdmins =
    await api.functional.oauthServer.admin.oauthServerAdmins.update(
      connection,
      {
        id: createdOauthAdmin.id,
        body: oauthAdminUpdateBody,
      },
    );
  typia.assert(updatedOauthAdmin);

  // Step 4: Verify updated fields
  TestValidator.equals(
    "updated admin email matches",
    updatedOauthAdmin.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated admin email_verified matches",
    updatedOauthAdmin.email_verified,
    updatedEmailVerified,
  );
  TestValidator.equals(
    "updated admin password_hash matches",
    updatedOauthAdmin.password_hash,
    updatedPasswordHash,
  );
  TestValidator.equals(
    "updated admin deleted_at null",
    updatedOauthAdmin.deleted_at,
    null,
  );

  TestValidator.predicate(
    "created_at is present",
    typeof createdOauthAdmin.created_at === "string" &&
      createdOauthAdmin.created_at.length > 0,
  );
  TestValidator.notEquals(
    "updated_at differs after update",
    createdOauthAdmin.updated_at,
    updatedOauthAdmin.updated_at,
  );

  // Step 5: Test update with invalid ID
  await TestValidator.error("update with invalid ID should throw", async () => {
    await api.functional.oauthServer.admin.oauthServerAdmins.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: oauthAdminUpdateBody,
      },
    );
  });

  // Step 6: Test unauthorized update attempt (simulate by clearing connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.oauthServer.admin.oauthServerAdmins.update(
      unauthConn,
      {
        id: createdOauthAdmin.id,
        body: oauthAdminUpdateBody,
      },
    );
  });

  // Step 7: Test validation error (invalid email format)
  await TestValidator.error(
    "update with invalid email format should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdmins.update(
        connection,
        {
          id: createdOauthAdmin.id,
          body: {
            ...oauthAdminUpdateBody,
            email: "invalid-email-format",
          } as IOauthServerOauthServerAdmins.IUpdate,
        },
      );
    },
  );
}
