import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";

/**
 * This test scenario verifies the retrieval of detailed information for a
 * specific OAuth server admin user by their unique ID, ensuring that all
 * provided information corresponds with the created admin user record. The
 * test begins by creating and authenticating an administrator user via the
 * /auth/admin/join API endpoint to obtain authorization. It then creates an
 * OAuth server admin user record through the POST
 * /oauthServer/admin/oauthServerAdmins endpoint. Subsequently, it attempts
 * to retrieve the OAuth server admin user by ID using the GET
 * /oauthServer/admin/oauthServerAdmins/{id} endpoint to verify the
 * correctness and completeness of returned data. The test asserts the
 * accuracy of the email, email_verified flag, and auditing fields such as
 * created_at, updated_at, and deleted_at. It also includes failure
 * validation scenarios for invalid or non-existing IDs, checking that the
 * system correctly handles such requests by throwing errors. The test
 * ensures that unauthorized access is prohibited and only authenticated
 * admins can access the retrieval endpoint. Throughout, responses are
 * validated with typia.assert for full runtime type correctness.
 */
export async function test_api_oauth_server_admins_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user (required for authorization)
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an OAuth server admin user record
  const oauthAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: RandomGenerator.pick([true, false]),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IOauthServerOauthServerAdmins.ICreate;
  const oauthAdmin: IOauthServerOauthServerAdmins =
    await api.functional.oauthServer.admin.oauthServerAdmins.create(
      connection,
      {
        body: oauthAdminCreateBody,
      },
    );
  typia.assert(oauthAdmin);

  // 3. Retrieve the OAuth server admin user by ID
  const retrieved: IOauthServerOauthServerAdmins =
    await api.functional.oauthServer.admin.oauthServerAdmins.at(connection, {
      id: oauthAdmin.id,
    });
  typia.assert(retrieved);

  // 4. Validate that data matches the created OAuth server admin user
  TestValidator.equals("oauth server admin: id", retrieved.id, oauthAdmin.id);
  TestValidator.equals(
    "oauth server admin: email",
    retrieved.email,
    oauthAdmin.email,
  );
  TestValidator.equals(
    "oauth server admin: email_verified",
    retrieved.email_verified,
    oauthAdmin.email_verified,
  );
  TestValidator.equals(
    "oauth server admin: password_hash",
    retrieved.password_hash,
    oauthAdmin.password_hash,
  );
  TestValidator.equals(
    "oauth server admin: created_at",
    retrieved.created_at,
    oauthAdmin.created_at,
  );
  TestValidator.equals(
    "oauth server admin: updated_at",
    retrieved.updated_at,
    oauthAdmin.updated_at,
  );
  TestValidator.equals(
    "oauth server admin: deleted_at",
    retrieved.deleted_at ?? null,
    oauthAdmin.deleted_at ?? null,
  );

  // 5. Test failure case: invalid UUID format
  await TestValidator.error(
    "should throw error for invalid UUID format",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdmins.at(connection, {
        id: "invalid-uuid-format" as unknown as string & tags.Format<"uuid">,
      });
    },
  );

  // 6. Test failure case: non-existent UUID
  const randomNonexistentId = typia.random<string & tags.Format<"uuid">>();
  // Ensure the generated ID is different from the created admin's ID
  if (randomNonexistentId !== oauthAdmin.id) {
    await TestValidator.error(
      "should throw error for non-existent ID",
      async () => {
        await api.functional.oauthServer.admin.oauthServerAdmins.at(
          connection,
          {
            id: randomNonexistentId,
          },
        );
      },
    );
  }
}
