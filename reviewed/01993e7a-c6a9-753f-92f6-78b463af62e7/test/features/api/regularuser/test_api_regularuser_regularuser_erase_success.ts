import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test scenario:
 *
 * 1. Create a new regular user with valid randomized data via join.
 * 2. Assert the join response is correctly typed.
 * 3. Permanently delete the created user by ID.
 * 4. Confirm deleting the same user again throws an error (user not found).
 * 5. Create another user, then attempt deletion without authentication,
 *    expecting authorization failure error.
 *
 * The test ensures API compliance with auth and deletion logic, proper
 * error handling, and strict type safety.
 */
export async function test_api_regularuser_regularuser_erase_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new regular user
  const createUserBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: createUserBody,
    },
  );
  typia.assert(authorizedUser);

  // Extract user ID from the authorizedUser response
  const userId = authorizedUser.id;

  // Step 3: Erase the user
  await api.functional.recipeSharing.regularUser.regularUsers.erase(
    connection,
    {
      id: userId,
    },
  );

  // Step 4: Attempt to erase again, expecting an error
  await TestValidator.error(
    "erasing already deleted user should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.regularUsers.erase(
        connection,
        {
          id: userId,
        },
      );
    },
  );

  // Step 5: Attempt to erase without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Create another user for unauthorized erase test
  const anotherUserBody = {
    email: RandomGenerator.alphaNumeric(9) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const anotherAuthorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: anotherUserBody,
    },
  );
  typia.assert(anotherAuthorizedUser);
  const anotherUserId = anotherAuthorizedUser.id;

  await TestValidator.error("unauthorized erase call should fail", async () => {
    await api.functional.recipeSharing.regularUser.regularUsers.erase(
      unauthenticatedConnection,
      {
        id: anotherUserId,
      },
    );
  });
}
