import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

/**
 * Test unauthorized update attempt to measurement unit by regular user
 * without valid authorization.
 *
 * This test verifies that attempting to update a measurement unit with
 * invalid or missing authorization credentials results in an access denied
 * error. No changes should be persisted to the unit's data.
 *
 * Steps:
 *
 * 1. Create a regular user authentication context by calling the join endpoint
 *    twice (required dependency).
 * 2. Attempt to update an existing measurement unit using a fresh connection
 *    without authorization tokens.
 * 3. Validate that an authorization error is thrown indicating access denied.
 *
 * This ensures the API endpoint enforces correct authorization
 * requirements.
 */
export async function test_api_regular_user_units_update_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create regular user authentication contexts as required by dependencies
  for (let i = 0; i < 2; i++) {
    const userCreationPayload = {
      email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(32),
      username: RandomGenerator.name(2),
    } satisfies IRecipeSharingRegularUser.ICreate;

    const authorizedUser = await api.functional.auth.regularUser.join(
      connection,
      { body: userCreationPayload },
    );
    typia.assert(authorizedUser);
  }

  // Step 2: Attempt to update a unit without valid auth by using an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {}, // empty headers to simulate no auth
  };

  // Prepare realistic update data for measurement unit
  const updateBody = {
    code: `unitCode${RandomGenerator.alphaNumeric(4)}`,
    name: `Unit Name ${RandomGenerator.name(1)}`,
    abbreviation: `abbr${RandomGenerator.alphaNumeric(2)}`,
  } satisfies IRecipeSharingUnits.IUpdate;

  // Use a random UUID for the unit id to simulate update target
  const randomUnitId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Validate an error is thrown due to missing authorization
  await TestValidator.error("unauthorized update must fail", async () => {
    await api.functional.recipeSharing.regularUser.units.update(
      unauthenticatedConnection,
      {
        id: randomUnitId,
        body: updateBody,
      },
    );
  });
}
