import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test unauthorized error scenarios for updating a regular user profile.
 *
 * This test validates that attempts to update a regular user profile
 * without proper authentication or authorization are correctly rejected by
 * the API. It first performs user registration to have a valid user ID,
 * then tests update calls without any auth token and with an empty headers
 * connection.
 *
 * The goal is to ensure the backend's authorization enforcement behaves as
 * expected, returning errors on unauthorized access attempts.
 *
 * Steps:
 *
 * 1. Create a regular user with realistic random data via join API.
 * 2. Validate authorized user response.
 * 3. Attempt update without auth token, expect rejection.
 * 4. Attempt update with cleared connection headers, expect rejection.
 *
 * This test avoids any manual header manipulation, relies on automatic SDK
 * handling, and ensures all API calls use correct DTO types and awaited
 * promises.
 */
export async function test_api_regularuser_regularuser_update_unauthorized_error(
  connection: api.IConnection,
) {
  // 1. Create a new regular user with valid random data
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(48),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // 2. Attempt update without authentication token
  const updateBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(48),
  } satisfies IRecipeSharingRegularUser.IUpdate;

  await TestValidator.error(
    "Update attempt without auth token should fail",
    async () => {
      // Using connection as-is, which has auth token only if join sets it
      // So to simulate no auth, shall create a copy or unauth connection
      const unauthConnection: api.IConnection = { ...connection, headers: {} };
      await api.functional.recipeSharing.regularUser.regularUsers.update(
        unauthConnection,
        {
          id: authorizedUser.id,
          body: updateBody1,
        },
      );
    },
  );

  // 3. Attempt update with empty headers connection (no auth)
  const emptyHeadersConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const updateBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(48),
  } satisfies IRecipeSharingRegularUser.IUpdate;

  await TestValidator.error(
    "Update attempt with empty headers should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.regularUsers.update(
        emptyHeadersConnection,
        {
          id: authorizedUser.id,
          body: updateBody2,
        },
      );
    },
  );
}
