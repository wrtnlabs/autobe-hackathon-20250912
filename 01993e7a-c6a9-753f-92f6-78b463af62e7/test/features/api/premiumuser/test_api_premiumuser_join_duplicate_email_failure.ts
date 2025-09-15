import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test registration failure for a premium user due to duplicate email
 * conflict.
 *
 * This test covers the business rule enforcing unique email for premium
 * users. It first registers a premium user with a unique email and then
 * attempts a second registration using the same email but different
 * credentials.
 *
 * Expected behavior:
 *
 * - First registration succeeds and returns authorized user data.
 * - Second registration fails with an error indicating email duplication.
 *
 * The test ensures that the backend correctly enforces unique constraints
 * while handling premium user creation.
 */
export async function test_api_premiumuser_join_duplicate_email_failure(
  connection: api.IConnection,
) {
  // Step 1: Generate unique email for premium user registration
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;

  // Step 2: First registration attempt with unique email
  const firstBody = {
    email,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const firstUser = await api.functional.auth.premiumUser.join(connection, {
    body: firstBody,
  });
  typia.assert(firstUser);

  TestValidator.equals(
    "First registration email matches",
    firstUser.email,
    firstBody.email,
  );

  // Step 3: Second registration attempt with the same email but different credentials
  const secondBody = {
    email, // same email to trigger duplicate conflict
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  // Expect an error due to duplicate email
  await TestValidator.error(
    "Second registration with duplicate email must fail",
    async () => {
      await api.functional.auth.premiumUser.join(connection, {
        body: secondBody,
      });
    },
  );
}
