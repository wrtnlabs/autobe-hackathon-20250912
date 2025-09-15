import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test successful update of a regular user profile by an admin.
 *
 * This test validates the complete flow of updating a regular user's
 * profile using admin privileges, including multi-role authentication
 * setup, data generation, the update operation, and response validation.
 *
 * Steps:
 *
 * 1. Create an admin user and authenticate.
 * 2. Create a regular user.
 * 3. Authenticate as the admin user again.
 * 4. Perform profile update on the regular user with new data.
 * 5. Validate the updated user profile matches expected updated data.
 *
 * All API responses are type-asserted to ensure correct data structure. All
 * required fields are included, nullable fields tested with explicit null.
 *
 * Ensures the system's role-switching and update mechanisms function
 * correctly within expected authorization boundaries.
 */
export async function test_api_admin_update_regular_user_profile_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
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

  // 2. Authenticate as admin user
  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create a regular user
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = "SafePassword456!";
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 4. Authenticate as admin user again to switch role
  const adminLoginAgain: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(adminLoginAgain);

  // 5. Prepare update payload for regular user
  const updatePayload = {
    full_name: RandomGenerator.name(),
    phone_number: null, // testing explicit null handling
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.IUpdate;

  // 6. Update regular user profile via PUT endpoint
  const updatedUser: IEventRegistrationRegularUser =
    await api.functional.eventRegistration.admin.regularUsers.update(
      connection,
      {
        regularUserId: regularUser.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedUser);

  // 7. Validate updated fields against update payload
  TestValidator.equals(
    "full_name matches update",
    updatedUser.full_name,
    updatePayload.full_name,
  );
  TestValidator.equals(
    "phone_number is updated to null",
    updatedUser.phone_number,
    null,
  );
  TestValidator.equals(
    "email_verified flag updated",
    updatedUser.email_verified,
    updatePayload.email_verified,
  );

  // 8. Validate unchanged fields are preserved
  TestValidator.equals("id unchanged", updatedUser.id, regularUser.id);
  TestValidator.equals("email unchanged", updatedUser.email, regularUser.email);
  TestValidator.equals(
    "created_at unchanged",
    updatedUser.created_at,
    regularUser.created_at,
  );
}
