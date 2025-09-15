import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This scenario tests successful updating of a regular user's profile by an
 * admin user. It covers the full flow from admin and regular user creation,
 * admin login, profile update, and validation of the updated fields including
 * nullable fields.
 *
 * It verifies the admin's ability to update email, full name, phone number
 * (nullable), profile picture URL (nullable), and email verification status.
 * Proper authentication and authorization contexts are validated.
 */
export async function test_api_regular_user_update_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminProfilePicture = `https://${RandomGenerator.alphaNumeric(8)}.com/profile.png`;
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: adminFullName,
    phone_number: adminPhone,
    profile_picture_url: adminProfilePicture,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 2. Regular user registration
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = RandomGenerator.alphaNumeric(16);
  const regularUserFullName = RandomGenerator.name();
  const regularUserPhone = RandomGenerator.mobile();
  const regularUserProfilePicture = `https://${RandomGenerator.alphaNumeric(8)}.com/profile.png`;
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
    full_name: regularUserFullName,
    phone_number: regularUserPhone,
    profile_picture_url: regularUserProfilePicture,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 3. Admin user login
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 4. Admin updates the regular user's profile
  // Update email, full_name, phone_number (nullable), profile_picture_url (nullable), email_verified
  const updateEmail = typia.random<string & tags.Format<"email">>();
  const updateFullName = RandomGenerator.name();
  // Nullable phone_number: set to null to test nullable field
  const updatePhoneNumber = null;
  // Nullable profile_picture_url: provide new URL
  const updateProfilePictureUrl = `https://${RandomGenerator.alphaNumeric(8)}.com/newprofile.png`;
  const updateEmailVerified = true;

  const updateBody = {
    email: updateEmail,
    full_name: updateFullName,
    phone_number: updatePhoneNumber,
    profile_picture_url: updateProfilePictureUrl,
    email_verified: updateEmailVerified,
  } satisfies IEventRegistrationRegularUser.IUpdate;

  const updatedUser: IEventRegistrationRegularUser =
    await api.functional.eventRegistration.admin.regularUsers.update(
      connection,
      {
        regularUserId: regularUser.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  // 5. Validate the updated fields
  TestValidator.equals(
    "email should be updated",
    updatedUser.email,
    updateEmail,
  );
  TestValidator.equals(
    "full_name should be updated",
    updatedUser.full_name,
    updateFullName,
  );
  TestValidator.equals(
    "phone_number should be null",
    updatedUser.phone_number,
    null,
  );
  TestValidator.equals(
    "profile_picture_url should be updated",
    updatedUser.profile_picture_url,
    updateProfilePictureUrl,
  );
  TestValidator.equals(
    "email_verified flag should be true",
    updatedUser.email_verified,
    updateEmailVerified,
  );
}
