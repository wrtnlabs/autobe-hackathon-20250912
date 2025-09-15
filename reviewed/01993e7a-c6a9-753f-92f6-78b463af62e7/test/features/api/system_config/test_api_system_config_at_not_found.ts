import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

/**
 * Test retrieving a system configuration entry by a non-existing UUID to
 * verify the API returns a proper not found error.
 *
 * This test simulates a call to the /recipeSharing/systemConfig/{id}
 * endpoint with a randomly generated UUID which is expected to not be
 * present in the system. It asserts that the API call throws an HttpError,
 * typically with a 404 status, indicating the resource was not found.
 */
export async function test_api_system_config_at_not_found(
  connection: api.IConnection,
) {
  // Generate a random UUID for a non-existent system config
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the system configuration with the non-existent ID
  // Expect this call to throw an HttpError indicating not found
  await TestValidator.error(
    "should throw not found error for non-existent system config ID",
    async () => {
      await api.functional.recipeSharing.systemConfig.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
