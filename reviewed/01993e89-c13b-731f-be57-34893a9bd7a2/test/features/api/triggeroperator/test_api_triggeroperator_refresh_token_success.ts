import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Test the successful refresh token workflow for a triggerOperator user.
 *
 * This test simulates a user session where a valid refresh token is
 * provided to the /auth/triggerOperator/refresh endpoint. It verifies the
 * issuance of a new access token and refresh token pair, validity of
 * returned token fields, and proper adherence to expected JWT token
 * structures.
 *
 * Steps:
 *
 * 1. Generate a valid refresh token string.
 * 2. Call the API endpoint with the refresh token.
 * 3. Assert the response conforms to the
 *    INotificationWorkflowTriggerOperator.IAuthorized type.
 * 4. Validate key response fields including the UUID format of id, non-empty
 *    email, and correctly structured token properties.
 * 5. Ensure that the access and refresh tokens are non-empty and that
 *    expiration fields are well-formed ISO date-time strings.
 * 6. Confirm optional deleted_at field is properly null or omitted.
 */
export async function test_api_triggeroperator_refresh_token_success(
  connection: api.IConnection,
) {
  // Step 1: Generate a valid refresh token string
  const refreshToken: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Call the refresh API with the refresh token
  const response: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.refresh.refreshTriggerOperator(
      connection,
      {
        body: {
          refresh_token: refreshToken,
        } satisfies INotificationWorkflowTriggerOperator.IRefresh,
      },
    );

  // Step 3: Assert the response type validity
  typia.assert(response);

  // Step 4: Validate required fields are correctly formed
  TestValidator.predicate(
    "id is non-empty string",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.predicate(
    "email is non-empty string",
    typeof response.email === "string" && response.email.length > 0,
  );

  // Step 5: Optional deleted_at must be null or valid date-time string if present
  if (response.deleted_at !== undefined && response.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is ISO date-time string",
      typeof response.deleted_at === "string" &&
        !isNaN(Date.parse(response.deleted_at)),
    );
  } else {
    TestValidator.equals(
      "deleted_at is null or undefined",
      response.deleted_at,
      null,
    );
  }

  // Step 6: Validate token fields are non-empty strings and valid date-time
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time string",
    typeof response.token.expired_at === "string" &&
      !isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    typeof response.token.refreshable_until === "string" &&
      !isNaN(Date.parse(response.token.refreshable_until)),
  );
}
