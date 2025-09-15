import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test forbidden error when a non-admin regular user attempts to delete
 * another regular user.
 *
 * This test verifies that only admin role users can delete regular user
 * accounts. It creates two regular users, authenticates as one, and
 * attempts to delete the other. The expected result is an authorization
 * failure preventing the deletion.
 */
export async function test_api_regular_user_delete_regular_user_forbidden(
  connection: api.IConnection,
) {
  // 1. Create the first regular user A
  const userACreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const userA: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userACreateBody,
    });
  typia.assert(userA);

  // 2. Create the second regular user B
  const userBCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const userB: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userBCreateBody,
    });
  typia.assert(userB);

  // 3. Login as regular user A
  const loginBodyA = {
    email: userACreateBody.email,
    password_hash: userACreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const userALogin: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: loginBodyA,
    });
  typia.assert(userALogin);

  // 4. Attempt to delete regular user B as regular user A
  await TestValidator.error(
    "non-admin user cannot delete another regular user",
    async () => {
      await api.functional.eventRegistration.admin.regularUsers.erase(
        connection,
        {
          regularUserId: userB.id,
        },
      );
    },
  );
}
