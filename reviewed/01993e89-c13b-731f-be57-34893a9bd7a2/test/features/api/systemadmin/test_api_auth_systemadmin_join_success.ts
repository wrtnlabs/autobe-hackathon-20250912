import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * This test validates the successful registration of a new system
 * administrator user. It covers the full join process by submitting a valid
 * email and password according to IRequestJoin. The returned IAuthorized
 * response is thoroughly validated to confirm the presence and correctness
 * of the user's id, email, hashed password, timestamps, optional deletion
 * timestamp, and JWT tokens. Utilizes typia for random realistic data
 * generation and strict response assertion to ensure full compliance and
 * readiness for further admin operations.
 */
export async function test_api_auth_systemadmin_join_success(
  connection: api.IConnection,
) {
  // Prepare valid join request body with random but realistic data
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  // Call the join API endpoint with the request body
  const response: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: requestBody,
    });

  // Assert the response fully conforms to the IAuthorized DTO
  typia.assert(response);

  // Additional business logic checks (optional but recommended)
  TestValidator.predicate(
    "response.id is non-empty string",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.predicate(
    "response.email matches request email",
    response.email === requestBody.email,
  );
  TestValidator.predicate(
    "response.password_hash is a non-empty string",
    typeof response.password_hash === "string" &&
      response.password_hash.length > 0,
  );
  TestValidator.predicate(
    "response.created_at is valid date-time string",
    typeof response.created_at === "string" &&
      !Number.isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "response.updated_at is valid date-time string",
    typeof response.updated_at === "string" &&
      !Number.isNaN(Date.parse(response.updated_at)),
  );
  if (response.deleted_at !== null && response.deleted_at !== undefined) {
    TestValidator.predicate(
      "response.deleted_at is valid date-time string if present",
      typeof response.deleted_at === "string" &&
        !Number.isNaN(Date.parse(response.deleted_at)),
    );
  }

  // Validate token object inside response
  const token = response.token;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid date-time string",
    typeof token.expired_at === "string" &&
      !Number.isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date-time string",
    typeof token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(token.refreshable_until)),
  );
}
