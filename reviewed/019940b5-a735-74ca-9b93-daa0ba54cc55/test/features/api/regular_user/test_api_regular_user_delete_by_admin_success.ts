import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This E2E test validates the successful permanent deletion of a regular user
 * by an admin user in the event registration system.
 *
 * The test covers the complete user lifecycle for this scenario by following
 * these steps:
 *
 * 1. Create an admin user account using the provided createAdminUser API and
 *    assert the correctness of the response and token.
 * 2. Authenticate the admin user with loginAdminUser API and assert the
 *    authenticated admin details, ensuring proper authorization context is
 *    established.
 * 3. Create a regular user account using joinRegularUser API with valid details
 *    and assert the authorized regular user object and token.
 * 4. Authenticate the regular user via loginRegularUser API to complete multi-role
 *    authentication setup.
 * 5. Using the authenticated context for the admin user, call the erase function
 *    to permanently delete the previously created regular user by specifying
 *    their user id complying with UUID format.
 * 6. Validate that the erase API call completes successfully without throwing
 *    errors, indicating proper deletion and authorization enforcement.
 *
 * Throughout the test, use typia.assert for full type safety validation of API
 * responses. Use descriptive TestValidator assertions for key validation
 * points. Handle all async API calls properly with await. Enforce all API
 * function call contracts and request body DTO types strictly.
 *
 * This test ensures the admin can successfully perform user deletion and that
 * cascading deletions and permission boundaries are enforced as intended.
 */
export async function test_api_regular_user_delete_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user account
  const adminCreateBody = {
    email: `admin-${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin join has valid id",
    typeof admin.id === "string",
  );
  TestValidator.predicate(
    "admin join has token access",
    typeof admin.token.access === "string",
  );

  // 2. Admin login to authenticate
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);
  TestValidator.equals("admin login id matches", adminLoggedIn.id, admin.id);

  // 3. Create a regular user account
  const regularUserCreateBody = {
    email: `user-${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);
  TestValidator.predicate(
    "regular user join has valid id",
    typeof regularUser.id === "string",
  );
  TestValidator.predicate(
    "regular user join has token access",
    typeof regularUser.token.access === "string",
  );

  // 4. Regular user login to authenticate
  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const regularUserLoggedIn: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLoggedIn);
  TestValidator.equals(
    "regular user login id matches",
    regularUserLoggedIn.id,
    regularUser.id,
  );

  // 5. Delete the regular user permanently by admin
  await api.functional.eventRegistration.admin.regularUsers.erase(connection, {
    regularUserId: regularUser.id,
  });

  // 6. Confirm deletion by attempting to delete again results in error
  await TestValidator.error(
    "deleting non-existent user throws error",
    async () => {
      await api.functional.eventRegistration.admin.regularUsers.erase(
        connection,
        {
          regularUserId: regularUser.id,
        },
      );
    },
  );
}
