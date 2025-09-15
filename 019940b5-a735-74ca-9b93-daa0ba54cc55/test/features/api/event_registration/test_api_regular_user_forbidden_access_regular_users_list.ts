import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationRegularUser";

/**
 * Validate that a regular user is forbidden to access the admin's regular
 * users list.
 *
 * This test covers the scenario where a regular user attempts to call the
 * admin-only PATCH /eventRegistration/admin/regularUsers endpoint. It
 * ensures that proper authorization checks prevent access and an error is
 * thrown.
 *
 * Test steps:
 *
 * 1. Create a regular user with required data.
 * 2. Login as that regular user to establish user authentication context.
 * 3. Attempt to call PATCH /eventRegistration/admin/regularUsers as the
 *    regular user.
 * 4. Confirm the call fails due to insufficient permission (authorization
 *    error).
 *
 * This confirms that the server correctly enforces admin-only access for
 * this API.
 */
export async function test_api_regular_user_forbidden_access_regular_users_list(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account
  const regularUserCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 2. Login as the regular user
  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const loginAuthorized: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Prepare an empty filter request body for the admin regularUsers index endpoint
  const regularUsersRequestBody =
    {} satisfies IEventRegistrationRegularUser.IRequest;

  // 4. Try to call the admin regular users list endpoint as the regular user
  await TestValidator.error(
    "Regular user forbidden to access admin regular users list",
    async () => {
      await api.functional.eventRegistration.admin.regularUsers.index(
        connection,
        { body: regularUsersRequestBody },
      );
    },
  );
}
