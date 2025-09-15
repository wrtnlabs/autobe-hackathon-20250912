import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";

/**
 * Test the administrator registration and token issuance process.
 *
 * This test covers the full flow of registering a new administrator account
 * through the POST /auth/admin/join API endpoint. It verifies that a valid
 * unique email and username are accepted and result in successful
 * registration with issuance of JWT access & refresh tokens.
 *
 * The test also checks that duplicate email registration produces an error.
 *
 * Steps:
 *
 * 1. Register a new admin with valid and unique email and username.
 * 2. Verify the response type and fields conform to IEasySignAdmin.IAuthorized
 *    including tokens.
 * 3. Attempt to register another admin with the same email and expect an
 *    error.
 *
 * All required fields are included, type safety is checked, and response
 * validation is done using typia.assert.
 */
export async function test_api_admin_registration_and_token_issue(
  connection: api.IConnection,
) {
  // Generate unique email and username for registration
  const email = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const username = `admin_${RandomGenerator.alphaNumeric(6)}`;

  // 1. Register a new administrator account using the join endpoint
  const authorized: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        username: username,
      } satisfies IEasySignAdmin.ICreate,
    });
  // Assert the response matches the authorization DTO
  typia.assert(authorized);
  typia.assert(authorized.token);

  TestValidator.predicate(
    "valid access token present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "valid refresh token present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Check the token expiration and refreshable_until fields are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "token.expired_at is full ISO 8601 date-time string",
    /^?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is full ISO 8601 date-time string",
    /^?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/.test(
      authorized.token.refreshable_until,
    ),
  );

  // 2. Attempt to register another admin with the same email, expect an error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: email,
          username: `another_${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IEasySignAdmin.ICreate,
      });
    },
  );
}
