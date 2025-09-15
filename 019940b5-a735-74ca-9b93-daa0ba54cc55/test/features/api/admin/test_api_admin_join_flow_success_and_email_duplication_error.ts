import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

/**
 * This scenario tests the creation of a new admin user account via the
 * /auth/admin/join endpoint. The test ensures that an admin can successfully
 * create an account with a unique email, hashed password, full name, and
 * optional phone number and profile picture URL. It verifies that the admin
 * starts with email_verified set false and that JWT tokens are correctly issued
 * upon successful creation, establishing a new authentication context for
 * subsequent admin operations. The scenario also covers failure cases such as
 * duplicate email registration.
 *
 * Steps:
 *
 * 1. Create a new admin user with a random unique email, password_hash, full_name,
 *    and optionally phone_number and profile_picture_url set to null.
 * 2. Verify the output admin user details including id, email, password_hash,
 *    full_name, phone_number, profile_picture_url, email_verified (false), and
 *    timestamps.
 * 3. Confirm JWT tokens are correctly issued.
 * 4. Attempt creating another admin user with the same email, expecting an error
 *    to confirm duplication enforcement.
 */
export async function test_api_admin_join_flow_success_and_email_duplication_error(
  connection: api.IConnection,
) {
  // Step 1: Create first admin user
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // Typically a hashed password
  const fullName = RandomGenerator.name();

  const firstAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: email,
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  TestValidator.predicate(
    "admin ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstAdmin.id,
    ),
  );

  TestValidator.equals(
    "email_verified should be false initially",
    firstAdmin.email_verified,
    false,
  );

  TestValidator.equals("email should match input", firstAdmin.email, email);

  TestValidator.equals(
    "full name should match input",
    firstAdmin.full_name,
    fullName,
  );

  // JWT token presence checks
  TestValidator.predicate(
    "access token should be set",
    typeof firstAdmin.token.access === "string" &&
      firstAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be set",
    typeof firstAdmin.token.refresh === "string" &&
      firstAdmin.token.refresh.length > 0,
  );

  // Step 2: Attempt duplicate admin creation with same email to test error
  await TestValidator.error("duplicate email should cause error", async () => {
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: email, // Duplicate
        password_hash: RandomGenerator.alphaNumeric(64),
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  });
}
