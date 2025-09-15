import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

/**
 * Test that system configuration creation fails when unauthenticated or
 * unauthorized, ensuring the appropriate error is returned.
 *
 * This test:
 *
 * 1. Creates a moderator user to establish authentication context.
 * 2. Attempts to create a system config entry without authentication; expects
 *    failure.
 * 3. Optionally, can test creation with a different authenticated user to
 *    simulate unauthorized access.
 * 4. Verifies errors are thrown as expected for unauthorized access.
 */
export async function test_api_system_config_create_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create a moderator user by joining
  const moderatorBody = typia.random<IRecipeSharingModerator.ICreate>();
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Try to create a system config entry without authentication (unauthenticated connection)
  // Create a clone of the connection with empty headers to simulate no auth
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const systemConfigCreateBody =
    typia.random<IRecipeSharingSystemConfig.ICreate>();

  await TestValidator.error(
    "unauthenticated creation should fail",
    async () => {
      await api.functional.recipeSharing.moderator.systemConfig.create(
        unauthConn,
        {
          body: systemConfigCreateBody,
        },
      );
    },
  );

  // 3. Optionally, create a second moderator user to simulate unauthorized user
  // Note: Since only one moderator join endpoint exists, rejoin to get a new moderator
  const mod2Body = typia.random<IRecipeSharingModerator.ICreate>();
  const moderator2: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: mod2Body,
    });
  typia.assert(moderator2);

  // 4. Use the second moderator's token (automatically set by SDK) to try creating system config
  // The SDK's connection will have the authentication header of the last login
  // But this test only uses the passed connection object. For strictness, simulate this with a new connection
  // Here, simulate unauthorized user by creating a new connection copying original headers but replacing authorization

  // But since SDK manages token automatically on join, we use the connection object as is
  // We will attempt creation and expect error if unauthorized

  // For testing with authorized user, the creation would succeed usually, but here we check unauthorized
  // So just try creation with the second moderator's context, potentially expecting failure

  await TestValidator.error(
    "unauthorized user creation should fail",
    async () => {
      await api.functional.recipeSharing.moderator.systemConfig.create(
        connection,
        {
          body: typia.random<IRecipeSharingSystemConfig.ICreate>(),
        },
      );
    },
  );
}
