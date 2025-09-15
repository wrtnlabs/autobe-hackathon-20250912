import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_regularuser_join_duplicate_username_failure(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user with a unique username (randomized to avoid conflicts in tests)
  const baseUsername = `unique_user_${RandomGenerator.alphaNumeric(5)}`;
  const initialUserBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: baseUsername,
  } satisfies IRecipeSharingRegularUser.ICreate;
  const createdUser = await api.functional.auth.regularUser.join(connection, {
    body: initialUserBody,
  });
  typia.assert(createdUser);

  // Step 2: Attempt to create another user with the same username to simulate duplicate conflict
  const duplicateUserBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: baseUsername,
  } satisfies IRecipeSharingRegularUser.ICreate;

  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.regularUser.join(connection, {
      body: duplicateUserBody,
    });
  });
}
