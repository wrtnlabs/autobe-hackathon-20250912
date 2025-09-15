import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import type { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

/**
 * This test function validates the guest registration endpoint POST
 * /auth/guest/join.
 *
 * It tests that an unauthenticated user can request a guest account
 * creation with a minimal empty payload, receiving in response a valid
 * guest identifier and a JWT token set.
 *
 * The test asserts the following:
 *
 * - The guest registration endpoint accepts an empty body {} complying with
 *   IOauthServerGuest.ICreate.
 * - The response structure matches IOauthServerOauthServerGuest.IAuthorized.
 * - The returned guest ID is a valid UUID string.
 * - The token contains non-empty access and refresh strings.
 * - The token expiration timestamps are valid ISO 8601 date-time strings with
 *   'T' separator.
 * - No authentication or credential fields are involved.
 *
 * This validates the business rules for ephemeral, unauthenticated guest
 * session initialization.
 */
export async function test_api_guest_join_registration_and_token_issue(
  connection: api.IConnection,
) {
  // 1. Call the guest join API with an empty payload
  const output: IOauthServerOauthServerGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {},
    });

  // 2. Assert the output matches the expected authorized guest type
  typia.assert(output);

  // 3. Validate guest user ID format as UUID
  TestValidator.predicate(
    "guest id should be valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );

  // 4. Check that token object exists with all required token fields as non-empty strings
  TestValidator.predicate(
    "token must be present and object",
    output.token !== null &&
      typeof output.token === "object" &&
      typeof output.token.access === "string" &&
      output.token.access.length > 0 &&
      typeof output.token.refresh === "string" &&
      output.token.refresh.length > 0 &&
      typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0 &&
      typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );

  // 5. Validate expiration timestamps are ISO 8601 date-time strings with required 'T' separator
  const iso8601Regex =
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])?$/;
  TestValidator.predicate(
    "expired_at token must be valid ISO 8601",
    iso8601Regex.test(output.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until token must be valid ISO 8601",
    iso8601Regex.test(output.token.refreshable_until),
  );
}
