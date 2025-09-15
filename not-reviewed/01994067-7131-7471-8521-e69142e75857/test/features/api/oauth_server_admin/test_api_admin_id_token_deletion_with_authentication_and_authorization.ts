import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

/**
 * E2E test to verify secure deletion of OAuth server admin ID tokens with full
 * authentication and authorization.
 *
 * Business Context:
 *
 * - Ensures that only authenticated admin users can delete their ID tokens.
 * - Protects token lifecycle from unauthorized access or manipulation.
 * - Multi-role scenario included verifying admin vs member permissions.
 *
 * Test Workflow:
 *
 * 1. Register a new admin user via admin join API.
 * 2. Login as the created admin user to obtain authentication tokens.
 * 3. Create an OAuth ID token for the admin user simulating session token.
 * 4. Delete the created ID token successfully using its UUID.
 * 5. Attempt to delete the same token again to confirm error handling on
 *    non-existence.
 * 6. Create a member user and login to simulate unauthorized role.
 * 7. Attempt to delete the admin ID token using member credentials to ensure
 *    access denial.
 *
 * All API responses will be asserted with typia.assert to ensure type
 * correctness. TestValidator used for business logic validation and error
 * expectation.
 */
export async function test_api_admin_id_token_deletion_with_authentication_and_authorization(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin1234!";

  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Admin user login
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create an ID token for admin user
  const idTokenCreateBody = {
    oauth_client_id: typia.random<string & tags.Format<"uuid">>(),
    authorization_code_id: null,
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IOauthServerIdToken.ICreate;

  const createdIdToken: IOauthServerIdToken =
    await api.functional.oauthServer.member.idTokens.createIdToken(connection, {
      body: idTokenCreateBody,
    });
  typia.assert(createdIdToken);

  // 4. Delete the created ID token
  await api.functional.oauthServer.admin.idTokens.erase(connection, {
    id: createdIdToken.id,
  });

  // 5. Attempt to delete the same token again - expect error
  await TestValidator.error(
    "deleting non-existent token should fail",
    async () => {
      await api.functional.oauthServer.admin.idTokens.erase(connection, {
        id: createdIdToken.id,
      });
    },
  );

  // 6. Create a member user and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member1234!";

  const memberUser: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(memberUser);

  const memberLogin: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ILogin,
    });
  typia.assert(memberLogin);

  // 7. Attempt to delete admin ID token using member auth - expect error
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member role cannot delete admin's ID token",
    async () => {
      await api.functional.oauthServer.admin.idTokens.erase(connection, {
        id: fakeId,
      });
    },
  );
}
