import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test successful retrieval of detailed regular user information by admin.
 *
 * This test performs the complete flow to validate that an admin user can
 * retrieve detailed information about a regular user using the regular
 * user's unique ID. It involves:
 *
 * 1. Creating an admin user account via /auth/admin/join
 * 2. Logging in the admin user via /auth/admin/login to activate admin
 *    authentication context
 * 3. Creating a regular user account via /auth/regularUser/join
 * 4. Retrieving detailed regular user information as admin via GET
 *    /eventRegistration/admin/regularUsers/{regularUserId}
 * 5. Validating that the retrieved user data matches the created regular user
 *
 * The test ensures authentication role switching, user creation, and
 * detailed data retrieval workflows are correctly implemented and secured.
 *
 * @param connection API connection interface
 */
export async function test_api_admin_retrieve_regular_user_detail_success(
  connection: api.IConnection,
) {
  // 1. Admin user account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin user login to switch auth context
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Regular user account creation
  const regularUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 4. Retrieve detailed regular user information by admin
  const retrievedUser: IEventRegistrationRegularUser =
    await api.functional.eventRegistration.admin.regularUsers.at(connection, {
      regularUserId: regularUser.id,
    });
  typia.assert(retrievedUser);

  // 5. Validate retrieved user details matches created regular user
  TestValidator.equals(
    "regular user id matches",
    retrievedUser.id,
    regularUser.id,
  );
  TestValidator.equals(
    "regular user email matches",
    retrievedUser.email,
    regularUser.email,
  );
  TestValidator.equals(
    "regular user full name matches",
    retrievedUser.full_name,
    regularUser.full_name,
  );
  TestValidator.equals(
    "regular user phone number matches",
    retrievedUser.phone_number,
    regularUser.phone_number,
  );
  TestValidator.equals(
    "regular user profile picture URL matches",
    retrievedUser.profile_picture_url,
    regularUser.profile_picture_url,
  );
  TestValidator.equals(
    "regular user email verified status matches",
    retrievedUser.email_verified,
    regularUser.email_verified,
  );
  TestValidator.equals(
    "regular user created_at matches",
    retrievedUser.created_at,
    regularUser.created_at,
  );
  TestValidator.equals(
    "regular user updated_at matches",
    retrievedUser.updated_at,
    regularUser.updated_at,
  );
}
