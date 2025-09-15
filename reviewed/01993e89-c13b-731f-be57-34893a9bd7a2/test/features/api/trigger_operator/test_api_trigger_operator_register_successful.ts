import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Validate the successful registration of a new trigger operator user.
 *
 * This test covers the scenario where a new trigger operator registers with
 * a unique email and a hashed password via POST /auth/triggerOperator/join.
 * It verifies that the response contains a valid authorized user object
 * including JWT token details.
 *
 * Steps:
 *
 * 1. Generate unique, valid email and password hash for trigger operator.
 * 2. Call the joinTriggerOperator API endpoint to register the user.
 * 3. Assert the response matches the
 *    INotificationWorkflowTriggerOperator.IAuthorized DTO.
 * 4. Verify critical fields including id, email, password_hash, timestamps,
 *    and token presence.
 *
 * @param connection The API connection object
 */
export async function test_api_trigger_operator_register_successful(
  connection: api.IConnection,
) {
  // Generate unique email and password hash for registration
  const createBody = {
    email:
      RandomGenerator.name(1).toLowerCase().replace(/\s/g, "") + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  // Call the joinTriggerOperator API to register
  const authorized: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: createBody },
    );

  // Assert the correctness of the response with typia
  typia.assert(authorized);

  // Validate important fields explicitly through TestValidator
  TestValidator.predicate(
    "Authorized response includes id",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.equals(
    "Email matches input",
    authorized.email,
    createBody.email,
  );
  TestValidator.equals(
    "Password hash matches input",
    authorized.password_hash,
    createBody.password_hash,
  );
  TestValidator.predicate(
    "Created_at is ISO date string",
    typeof authorized.created_at === "string" &&
      !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "Updated_at is ISO date string",
    typeof authorized.updated_at === "string" &&
      !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null or string",
    authorized.deleted_at === null ||
      authorized.deleted_at === undefined ||
      (typeof authorized.deleted_at === "string" &&
        !isNaN(Date.parse(authorized.deleted_at))),
  );

  // Validate token object and its properties
  TestValidator.predicate(
    "Token object exists",
    authorized.token !== null && typeof authorized.token === "object",
  );
  TestValidator.predicate(
    "Token access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "Token refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at is ISO date string",
    typeof authorized.token.expired_at === "string" &&
      !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "Token refreshable_until is ISO date string",
    typeof authorized.token.refreshable_until === "string" &&
      !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
}
