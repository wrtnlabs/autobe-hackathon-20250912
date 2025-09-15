import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * E2E test for deleting an email verification token as an admin
 *
 * This test function covers:
 *
 * 1. Admin user creation and authentication
 * 2. Regular user creation and authentication
 * 3. Email verification token creation for the regular user
 * 4. Admin deletes the email verification token
 * 5. Verification that token deletion occurred and token is inaccessible
 */
export async function test_api_email_verification_token_delete_admin_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user (join) and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = "admin-password-hash";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
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

  // 2. Login as admin to establish authentication context
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create a regular user (join) and authenticate
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPasswordHash = "user-password-hash";
  const regularUserCreateBody = {
    email: userEmail,
    password_hash: userPasswordHash,
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

  // 4. Login as regular user to establish authentication context
  const regularUserLoginBody = {
    email: userEmail,
    password_hash: userPasswordHash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const regularUserLogin: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLogin);

  // Switch back to admin context now for token creation and deletion
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // 5. Create an email verification token for the regular user
  const tokenValue = RandomGenerator.alphaNumeric(16);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day later

  const emailVerificationTokenCreateBody = {
    event_registration_regular_user_id: regularUser.id,
    token: tokenValue,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  } satisfies IEventRegistrationEmailVerificationToken.ICreate;

  const createdToken: IEventRegistrationEmailVerificationToken =
    await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.create(
      connection,
      {
        regularUserId: regularUser.id,
        body: emailVerificationTokenCreateBody,
      },
    );
  typia.assert(createdToken);

  // 6. Admin deletes the email verification token
  await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.eraseEmailVerificationToken(
    connection,
    {
      regularUserId: regularUser.id,
      emailVerificationTokenId: createdToken.id,
    },
  );

  // 7. Validate deletion: re-deleting the same token should raise error
  await TestValidator.error(
    "deleting same token again should fail",
    async () => {
      await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.eraseEmailVerificationToken(
        connection,
        {
          regularUserId: regularUser.id,
          emailVerificationTokenId: createdToken.id,
        },
      );
    },
  );
}
