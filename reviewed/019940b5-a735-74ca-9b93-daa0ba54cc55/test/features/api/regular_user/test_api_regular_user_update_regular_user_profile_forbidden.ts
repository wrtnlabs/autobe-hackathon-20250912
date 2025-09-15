import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test failure attempting to update a regular user profile using admin API
 * with regular user authentication.
 *
 * The test covers the scenario that a regular user tries to update their
 * profile through an admin-only update endpoint, which must be forbidden.
 *
 * Steps:
 *
 * 1. Register a regular user.
 * 2. Authenticate as the regular user.
 * 3. Attempt updating the regular user's profile by calling the admin update
 *    endpoint.
 * 4. Validate an authorization error occurs, preventing the operation.
 *
 * This tests verifies the strict enforcement of role-based access control
 * for admin operations.
 */
export async function test_api_regular_user_update_regular_user_profile_forbidden(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const createUserBody = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: createUserBody,
    });
  typia.assert(regularUser);

  // 2. Authenticate as the regular user
  const loginUserBody = {
    email: createUserBody.email,
    password_hash: createUserBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const loggedInUser =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: loginUserBody,
    });
  typia.assert(loggedInUser);

  // 3. Attempt admin update profile as regular user
  // Prepare update data
  const updateBody = {
    full_name: "Updated Name by Regular User",
  } satisfies IEventRegistrationRegularUser.IUpdate;

  // Because the connection is authenticated as regular user, calling admin update must fail
  await TestValidator.error(
    "regular user cannot update regular user profile via admin API",
    async () => {
      await api.functional.eventRegistration.admin.regularUsers.update(
        connection,
        {
          regularUserId: regularUser.id,
          body: updateBody,
        },
      );
    },
  );
}
