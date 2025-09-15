import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Scenario Overview: Test the Technical Project Manager (TPM) user registration
 * endpoint for successful account creation and handle duplicate email
 * registration failure.
 *
 * Step-by-Step Workflow:
 *
 * 1. Attempt to register a new TPM user with valid email, password, and name.
 * 2. Validate that the account is created with correct fields, and JWT tokens are
 *    returned.
 * 3. Attempt to register another TPM user with the same email.
 * 4. Verify that the API returns an error due to unique email constraint
 *    violation.
 *
 * Validation Points:
 *
 * - Successful creation returns authorized TPM user object with access tokens.
 * - Duplicate email registration returns conflict or validation error.
 *
 * Business Logic:
 *
 * - Enforces unique constraint on the email address.
 * - Password properly hashed on backend (not returned).
 *
 * Success Criteria:
 *
 * - New TPM user accounts are created successfully.
 * - Duplicate emails are rejected according to schema constraints.
 *
 * Error Handling:
 *
 * - Handles email duplication gracefully with appropriate error code and message.
 */
export async function test_api_tpm_join_successful_and_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Prepare TPM user join request body with random but valid email, password and name
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  // 2. Attempt TPM user registration
  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedUser);

  // 3. Validate required fields on the response
  typia.assert<string & tags.Format<"uuid">>(authorizedUser.id);
  TestValidator.equals(
    "authorizedUser.email matches request email",
    authorizedUser.email,
    joinRequest.email,
  );
  TestValidator.predicate(
    "password_hash is a non-empty string",
    typeof authorizedUser.password_hash === "string" &&
      authorizedUser.password_hash.length > 0,
  );
  TestValidator.equals(
    "name matches request name",
    authorizedUser.name,
    joinRequest.name,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date-time string",
    typeof authorizedUser.created_at === "string" &&
      !isNaN(Date.parse(authorizedUser.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time string",
    typeof authorizedUser.updated_at === "string" &&
      !isNaN(Date.parse(authorizedUser.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is either null or undefined",
    authorizedUser.deleted_at === null ||
      authorizedUser.deleted_at === undefined,
  );

  TestValidator.predicate(
    "access_token is a non-empty string if defined",
    authorizedUser.access_token === undefined ||
      (typeof authorizedUser.access_token === "string" &&
        authorizedUser.access_token.length > 0),
  );
  TestValidator.predicate(
    "refresh_token is a non-empty string if defined",
    authorizedUser.refresh_token === undefined ||
      (typeof authorizedUser.refresh_token === "string" &&
        authorizedUser.refresh_token.length > 0),
  );

  // 4. Validate token property presence and structure
  TestValidator.predicate(
    "token exists",
    authorizedUser.token !== null && authorizedUser.token !== undefined,
  );
  if (authorizedUser.token) {
    const token = authorizedUser.token as IAuthorizationToken;
    TestValidator.predicate(
      "token.access is non-empty string",
      typeof token.access === "string" && token.access.length > 0,
    );
    TestValidator.predicate(
      "token.refresh is non-empty string",
      typeof token.refresh === "string" && token.refresh.length > 0,
    );
    TestValidator.predicate(
      "token.expired_at is valid ISO date-time",
      typeof token.expired_at === "string" &&
        !isNaN(Date.parse(token.expired_at)),
    );
    TestValidator.predicate(
      "token.refreshable_until is valid ISO date-time",
      typeof token.refreshable_until === "string" &&
        !isNaN(Date.parse(token.refreshable_until)),
    );
  }

  // 5. Attempt to create TPM user again with the same email to provoke duplicate email error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.tpm.join(connection, {
        body: joinRequest,
      });
    },
  );
}
