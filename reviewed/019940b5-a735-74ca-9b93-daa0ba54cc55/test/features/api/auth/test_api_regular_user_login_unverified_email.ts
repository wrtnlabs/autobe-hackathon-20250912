import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This test ensures that a regular user whose email is unverified cannot
 * log in.
 *
 * Test steps:
 *
 * 1. Create a regular user account with email_verified set to false using the
 *    join API.
 * 2. Attempt to login with the same credentials.
 * 3. Verify that the login fails with an error indicating unverified email.
 *
 * This protects from unauthorized access until users verify their email.
 */
export async function test_api_regular_user_login_unverified_email(
  connection: api.IConnection,
) {
  // Step 1: Create regular user with email_verified = false
  const userEmail = `user${Date.now()}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(10);
  const createUserBody = {
    email: userEmail,
    password_hash: passwordHash,
    full_name: RandomGenerator.name(),
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const user: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: createUserBody,
    });
  typia.assert(user);

  // Step 2: Attempt to login with unverified email - expect error
  await TestValidator.error("login fails with unverified email", async () => {
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: passwordHash,
      } satisfies IEventRegistrationRegularUser.ILogin,
    });
  });
}
