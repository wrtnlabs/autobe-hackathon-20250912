import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";

/**
 * Validate retrieval of email verification token details by an authorized
 * admin.
 *
 * This test performs the following steps:
 *
 * 1. Creates an admin user to establish an admin authentication context.
 * 2. Simulates acquisition of a regular user ID and a corresponding email
 *    verification token ID. These UUIDs are randomly generated for testing
 *    purposes.
 * 3. Uses the admin authentication to retrieve the specific email verification
 *    token details associated with the specified regular user.
 * 4. Validates the returned token data with typia.assert and confirms that the
 *    token IDs match the requested values.
 */
export async function test_api_get_email_verification_token_detail_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create an admin user
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password_hash: RandomGenerator.alphaNumeric(20),
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Prepare test regular user ID and email verification token ID
  const regularUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emailVerificationTokenId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Retrieve the email verification token details by admin
  const tokenDetail: IEventRegistrationEmailVerificationToken =
    await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.at(
      connection,
      {
        regularUserId,
        emailVerificationTokenId,
      },
    );
  typia.assert(tokenDetail);

  // Step 4: Validate the fetched token IDs match the requested ones
  TestValidator.equals(
    "Verify regular user ID matches",
    tokenDetail.event_registration_regular_user_id,
    regularUserId,
  );
  TestValidator.equals(
    "Verify email verification token ID matches",
    tokenDetail.id,
    emailVerificationTokenId,
  );
}
