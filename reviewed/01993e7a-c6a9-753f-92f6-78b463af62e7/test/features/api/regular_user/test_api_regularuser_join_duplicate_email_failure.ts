import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the failure scenario where a new regular user registration is attempted
 * with an email address that already exists in the system. The scenario covers
 * the endpoint POST /auth/regularUser/join and validates that the system
 * rejects the request with an appropriate error response, enforcing uniqueness
 * on the email field. The scenario should setup by creating a prior user with
 * the same email through the same join endpoint to ensure conflict.
 */
export async function test_api_regularuser_join_duplicate_email_failure(
  connection: api.IConnection,
) {
  // Step 1: Generate a random email for user creation
  const email = typia.random<string & tags.Format<"email">>();

  // Step 2: Create the initial user with this email
  const initialUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email,
        password_hash: "hashed_password_placeholder",
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(initialUser);

  // Step 3: Attempt to create a second user with the same email to test duplicate rejection
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.regularUser.join(connection, {
        body: {
          email,
          password_hash: "hashed_password_placeholder",
          username: RandomGenerator.name(2),
        } satisfies IRecipeSharingRegularUser.ICreate,
      });
    },
  );
}
