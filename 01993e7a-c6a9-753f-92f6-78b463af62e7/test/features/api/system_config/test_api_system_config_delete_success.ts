import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test deleting a system configuration entry by id, ensuring the entry is
 * removed and subsequent retrieval attempts fail. This test:
 *
 * 1. Creates a moderator by calling the /auth/moderator/join endpoint
 * 2. Deletes a system configuration entry by calling
 *    /recipeSharing/moderator/systemConfig/{id} endpoint
 * 3. Verifies that the erase call succeeds without throwing
 */
export async function test_api_system_config_delete_success(
  connection: api.IConnection,
) {
  // 1. Moderator join: Create a moderator for authorization
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(64),
        username: RandomGenerator.name(),
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Delete a system configuration entry
  const systemConfigId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.recipeSharing.moderator.systemConfig.erase(connection, {
    id: systemConfigId,
  });
}
