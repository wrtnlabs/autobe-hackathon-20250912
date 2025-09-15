import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

/**
 * Test attempting to update a system configuration without proper
 * authorization.
 *
 * This test verifies that the API correctly rejects system configuration
 * update attempts made without proper moderator authorization.
 *
 * Workflow:
 *
 * 1. A new moderator account is created via the join API to establish the
 *    authorization context.
 * 2. The system attempts to update a system configuration entry using a new
 *    unique ID and a randomly generated update payload.
 * 3. The update is attempted with a connection simulating unauthorized access
 *    by removing authentication headers.
 * 4. The test expects the API call to fail due to lack of proper
 *    authorization, validating the authorization enforcement.
 *
 * This ensures that only authorized moderators can update system
 * configuration entries, protecting global platform settings from
 * unauthorized access.
 */
export async function test_api_system_config_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Prepare join body with valid random data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingModerator.ICreate;

  // 2. Perform the join operation (authorizes the moderator, presumably updates connection internally)
  // But since to test unauthorized update, we will NOT reuse this connection for update
  await api.functional.auth.moderator.join(connection, { body: joinBody });

  // 3. Generate random system configuration update payload
  const updateBody = typia.random<IRecipeSharingSystemConfig.IUpdate>();

  // 4. Use a freshly cloned or new connection with empty headers to simulate unauthorized access
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Generate a random UUID for system config id
  const systemConfigId = typia.random<string & tags.Format<"uuid">>();

  // 6. Attempt to update the system configuration with unauthorized connection
  // Expect the call to fail with an error
  await TestValidator.error(
    "system config update should fail due to unauthorized access",
    async () => {
      await api.functional.recipeSharing.moderator.systemConfig.update(
        unauthorizedConnection,
        {
          id: systemConfigId,
          body: updateBody,
        },
      );
    },
  );
}
