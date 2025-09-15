import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate that deletion of system configuration requires proper
 * authorization.
 *
 * This test confirms that attempts to delete a system configuration without
 * a valid moderator authorization token are rejected with error responses,
 * ensuring that only authorized moderators can perform such deletions.
 *
 * Workflow:
 *
 * 1. Execute moderator join to create an authorized moderator and acquire
 *    valid tokens.
 * 2. Attempt deletion without any authorization token, expect an error.
 * 3. Attempt deletion with an unauthenticated connection, expect an error.
 *
 * This validates enforcement of access control to the system configuration
 * delete endpoint.
 */
export async function test_api_system_config_delete_unauthorized(
  connection: api.IConnection,
) {
  // 1. Moderator join to satisfy authentication prerequisite
  const moderatorBody = {
    email: `tester${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });
  typia.assert(moderator);

  // 2. Prepare a random UUID to use as system config ID.
  const randomId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt deletion with unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated users cannot delete system config",
    async () => {
      await api.functional.recipeSharing.moderator.systemConfig.erase(
        unauthenticatedConnection,
        {
          id: randomId,
        },
      );
    },
  );

  // 4. Attempt deletion with an unauthorized connection (also without Authorization header)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized connections cannot delete system config",
    async () => {
      await api.functional.recipeSharing.moderator.systemConfig.erase(
        unauthorizedConnection,
        {
          id: randomId,
        },
      );
    },
  );
}
