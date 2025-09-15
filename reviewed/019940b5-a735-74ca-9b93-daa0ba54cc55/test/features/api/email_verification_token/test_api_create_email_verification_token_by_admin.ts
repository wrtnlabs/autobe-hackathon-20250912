import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";

/**
 * Test creating a new email verification token by an admin user for a
 * regular user.
 *
 * Workflow:
 *
 * 1. The admin user is created and authenticated.
 * 2. The admin creates a new email verification token for a regular user
 *    identified by a UUID.
 * 3. The creation response is validated for correctness, including association
 *    to the regular user ID.
 *
 * Validations ensure response types conform to expected DTOs.
 */
export async function test_api_create_email_verification_token_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Prepare regular user ID
  const regularUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Generate token creation data
  const tokenValue = RandomGenerator.alphaNumeric(32);
  const expiresAt = new Date(new Date().getTime() + 3600 * 1000).toISOString(); // 1 hour from now
  const createdAt = new Date().toISOString();

  const createTokenBody = {
    event_registration_regular_user_id: regularUserId,
    token: tokenValue,
    expires_at: expiresAt,
    created_at: createdAt,
  } satisfies IEventRegistrationEmailVerificationToken.ICreate;

  // 4. Create email verification token using admin context
  const tokenResponse: IEventRegistrationEmailVerificationToken =
    await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.create(
      connection,
      {
        regularUserId: regularUserId,
        body: createTokenBody,
      },
    );
  typia.assert(tokenResponse);

  // 5. Validate that token response belongs to the given regular user
  TestValidator.equals(
    "email verification token belongs to the correct regular user",
    tokenResponse.event_registration_regular_user_id,
    regularUserId,
  );

  // 6. Validate that token value matches the created value
  TestValidator.equals(
    "email verification token string matches created value",
    tokenResponse.token,
    tokenValue,
  );

  // 7. Validate that expires_at and created_at are ISO strings
  // ISO string format validation is already guaranteed by type system + typia.assert
}
