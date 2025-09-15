import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * E2E test for admin successfully deleting a regular user.
 *
 * The test flow is:
 *
 * 1. Create admin user and authenticate.
 * 2. Create regular user to be deleted.
 * 3. Authenticate as admin.
 * 4. Delete the regular user using DELETE API.
 * 5. Attempt login as deleted regular user, expecting failure.
 *
 * This confirms both successful deletion and that the user is no longer able to
 * login.
 */
export async function test_api_admin_delete_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Create admin user (join & login)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<string>();

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create regular user to be deleted
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUserPassword: string = typia.random<string>();

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 3. Authenticated as admin at this point (via tokens and sdk headers)

  // 4. Perform deletion of the regular user by admin
  await api.functional.eventRegistration.admin.regularUsers.erase(connection, {
    regularUserId: regularUser.id,
  });

  // 5. Validate regular user cannot login after deletion
  await TestValidator.error("deleted regular user cannot login", async () => {
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
      } satisfies IEventRegistrationRegularUser.ILogin,
    });
  });
}
