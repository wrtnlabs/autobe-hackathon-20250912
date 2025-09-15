import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * E2E test function to validate admin OAuth server developer retrieval
 * success.
 *
 * This test covers the full workflow:
 *
 * 1. Admin join to create an admin account
 * 2. Admin login to acquire authentication token
 * 3. Create OAuth server developer via admin API
 * 4. Retrieve the created developer by ID
 * 5. Assert all returned properties match created developer
 * 6. Test unauthorized access scenarios
 * 7. Test retrieval of non-existent developer
 */
export async function test_api_oauth_server_admin_oauth_server_developer_get_success(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Admin logs in
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IOauthServerAdmin.ILogin;
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Create OAuth server developer
  const developerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: false,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IOauthServerDeveloper.ICreate;
  const developer: IOauthServerDeveloper =
    await api.functional.oauthServer.admin.oauthServerDevelopers.create(
      connection,
      { body: developerCreateBody },
    );
  typia.assert(developer);

  // 4. Retrieve developer by ID
  const retrievedDeveloper: IOauthServerDeveloper =
    await api.functional.oauthServer.admin.oauthServerDevelopers.at(
      connection,
      { id: developer.id },
    );
  typia.assert(retrievedDeveloper);

  // 5. Assert returned developer properties
  TestValidator.equals(
    "developer email matches",
    retrievedDeveloper.email,
    developer.email,
  );
  TestValidator.equals(
    "developer email_verified flag matches",
    retrievedDeveloper.email_verified,
    developer.email_verified,
  );
  TestValidator.equals(
    "developer id matches",
    retrievedDeveloper.id,
    developer.id,
  );
  TestValidator.equals(
    "developer created_at exists",
    typeof retrievedDeveloper.created_at === "string",
    true,
  );
  TestValidator.equals(
    "developer updated_at exists",
    typeof retrievedDeveloper.updated_at === "string",
    true,
  );

  // 6. Test unauthorized access - invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid.token.value" },
  };
  await TestValidator.error("invalid token access denied", async () => {
    await api.functional.oauthServer.admin.oauthServerDevelopers.at(
      invalidTokenConnection,
      { id: developer.id },
    );
  });

  // 7. Test unauthorized access - no token
  const noTokenConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("no token access denied", async () => {
    await api.functional.oauthServer.admin.oauthServerDevelopers.at(
      noTokenConnection,
      { id: developer.id },
    );
  });

  // 8. Test retrieval of non-existent developer
  await TestValidator.error(
    "non-existent developer retrieval fails",
    async () => {
      await api.functional.oauthServer.admin.oauthServerDevelopers.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
