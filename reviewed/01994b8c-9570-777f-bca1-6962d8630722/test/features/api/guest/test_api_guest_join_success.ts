import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianGuest";

/**
 * Test guest user join process success and error cases.
 *
 * This test covers the path /auth/guest/join POST for guest user
 * registration. Initially, it attempts to join with a new valid email and
 * expects a full authorized guest response with tokens. It then tests error
 * scenarios including invalid email format and duplicate email
 * registration.
 *
 * Steps:
 *
 * 1. Send valid guest join request with a new random email
 * 2. Assert the response structure and properties
 * 3. Attempt join with invalid email format expecting failure
 * 4. Attempt join with previously registered email expecting failure
 */
export async function test_api_guest_join_success(connection: api.IConnection) {
  // Generate a random valid email
  const guestEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;

  // 1) Join with valid email
  const authorized: ISubscriptionRenewalGuardianGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
      } satisfies ISubscriptionRenewalGuardianGuest.ICreate,
    });
  typia.assert(authorized);

  // Validate authorized properties
  TestValidator.predicate(
    "guest ID is non-empty string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.access_token === "string" &&
      authorized.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.refresh_token === "string" &&
      authorized.refresh_token.length > 0,
  );
  typia.assert(authorized.token);

  // 2) Attempt join with invalid email format
  await TestValidator.error(
    "join fails with invalid email format",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "invalid-email-format",
        } satisfies ISubscriptionRenewalGuardianGuest.ICreate,
      });
    },
  );

  // 3) Attempt join with duplicate email
  await TestValidator.error("join fails with duplicate email", async () => {
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
      } satisfies ISubscriptionRenewalGuardianGuest.ICreate,
    });
  });
}
