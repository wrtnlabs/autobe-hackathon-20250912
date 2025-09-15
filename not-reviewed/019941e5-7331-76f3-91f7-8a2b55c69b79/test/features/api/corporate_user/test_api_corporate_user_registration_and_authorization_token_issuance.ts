import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignCorporateUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignCorporateUser";

/**
 * Test the corporate user registration via /auth/corporateUser/join.
 *
 * Validates that sending a correctly structured registration request
 * results in issuance of a valid authorized corporate user object with
 * proper JWT tokens. Ensures key fields like id, email, company_name, and
 * token are properly returned.
 *
 * 1. Prepare a valid IEasySignCorporateUser.ICreate request body with required
 *    fields including a randomized valid email and company name, and null
 *    optional department and position fields.
 * 2. Invoke the join API method via the SDK.
 * 3. Validate the response type with typia.assert.
 * 4. Verify business-related validations on returned corporate user info,
 *    including UUID format, email format, and non-empty company name.
 * 5. Confirm that JWT token fields are present and with valid date strings.
 */
export async function test_api_corporate_user_registration_and_authorization_token_issuance(
  connection: api.IConnection,
) {
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    company_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    department: null,
    position: null,
  } satisfies IEasySignCorporateUser.ICreate;

  const authorizedUser: IEasySignCorporateUser.IAuthorized =
    await api.functional.auth.corporateUser.join(connection, {
      body: requestBody,
    });

  typia.assert(authorizedUser);

  TestValidator.predicate(
    "valid corporate user id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );
  TestValidator.predicate(
    "email contains @",
    authorizedUser.email.includes("@"),
  );
  TestValidator.predicate(
    "non-empty company name",
    typeof authorizedUser.company_name === "string" &&
      authorizedUser.company_name.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO date string",
    !Number.isNaN(Date.parse(authorizedUser.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO date string",
    !Number.isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );
}
