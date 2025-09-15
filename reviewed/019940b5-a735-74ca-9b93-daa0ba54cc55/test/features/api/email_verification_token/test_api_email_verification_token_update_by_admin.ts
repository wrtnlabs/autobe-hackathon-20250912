import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";

/**
 * This end-to-end test validates the update operation on an existing email
 * verification token belonging to a specific regular user by an admin
 * user.
 *
 * The test performs these key steps:
 *
 * 1. Creates and authenticates an admin user using the admin join API
 *    endpoint.
 * 2. Generates realistic UUIDs simulating existing regular user and their
 *    email verification token IDs.
 * 3. Constructs an update request body, extending the expiration timestamp of
 *    the token.
 * 4. Calls the email verification token update API using admin privileges.
 * 5. Uses typia.assert for strict runtime validation of the returned updated
 *    token.
 * 6. Validates via TestValidator that the expiration date was updated
 *    correctly.
 *
 * This test ensures proper authorization and successful update of the
 * token's expiry through the administrative API.
 */
export async function test_api_email_verification_token_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_example", // example hashed password
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Use fixed UUIDs representing existing regular user and their email verification token
  const regularUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emailVerificationTokenId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare the update body with extended expires_at timestamp
  const newExpiryDate: string & tags.Format<"date-time"> = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() satisfies string as string;

  const updateBody = {
    expires_at: newExpiryDate,
  } satisfies IEventRegistrationEmailVerificationToken.IUpdate;

  // 4. Admin updates the email verification token for the regular user
  const updatedToken: IEventRegistrationEmailVerificationToken =
    await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.update(
      connection,
      {
        regularUserId: regularUserId,
        emailVerificationTokenId: emailVerificationTokenId,
        body: updateBody,
      },
    );

  typia.assert(updatedToken);

  // 5. Verify that the token's expires_at is updated as expected
  TestValidator.equals(
    "Email verification token expires_at updated",
    updatedToken.expires_at,
    newExpiryDate,
  );
}
