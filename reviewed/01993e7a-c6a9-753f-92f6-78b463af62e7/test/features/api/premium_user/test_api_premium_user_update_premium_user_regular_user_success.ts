import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validates the update of a premium user profile by an authenticated regular
 * user.
 *
 * This test covers the full business flow:
 *
 * 1. Creation of a regular user through the join API.
 * 2. Utilizing the authorized regular user context, update a premium user's
 *    profile using valid update data.
 * 3. Verifies that the response matches the updated data with accurate type safety
 *    assertions.
 *
 * The test strictly adheres to all schema constraints, data formats, and
 * authentication requirements.
 *
 * Business rules ensure that only authorized regular users can perform this
 * update operation. The update includes changing email, username, and
 * premium_since fields.
 *
 * Steps:
 *
 * 1. Generate randomized valid regular user creation data.
 * 2. Authenticate and authorize the new regular user.
 * 3. Generate realistic update data for premium user.
 * 4. Call the update API with the premium user id and update data.
 * 5. Assert the response type correctness and content matches the update.
 */
export async function test_api_premium_user_update_premium_user_regular_user_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new regular user via join
  const regularUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreate,
    });
  typia.assert(authorizedUser);

  // Step 2: Prepare premium user update data
  // Generate random valid update data
  const updateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    premium_since: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
  } satisfies IRecipeSharingPremiumUser.IUpdate;

  // Generate a random premium user id (UUID)
  const premiumUserId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Call update API
  const updatedPremiumUser: IRecipeSharingPremiumUser =
    await api.functional.recipeSharing.regularUser.premiumUsers.update(
      connection,
      {
        id: premiumUserId,
        body: updateData,
      },
    );

  typia.assert(updatedPremiumUser);

  // Step 4: Validate that updated fields match
  TestValidator.equals(
    "updated email",
    updatedPremiumUser.email,
    updateData.email,
  );
  TestValidator.equals(
    "updated username",
    updatedPremiumUser.username,
    updateData.username,
  );
  TestValidator.equals(
    "updated premium_since date",
    updatedPremiumUser.premium_since,
    updateData.premium_since,
  );
}
