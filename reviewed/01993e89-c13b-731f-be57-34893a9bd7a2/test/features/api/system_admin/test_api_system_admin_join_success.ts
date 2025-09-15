import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

export async function test_api_system_admin_join_success(
  connection: api.IConnection,
) {
  // Generate a unique email for the new system admin user
  const email = typia.random<string & tags.Format<"email">>();
  // Provide a strong password string (plain text) for registration
  const password = RandomGenerator.alphaNumeric(12);

  // Compose request body for join operation strictly satisfying IRequestJoin
  const requestBody = {
    email: email,
    password: password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  // Perform the join API call
  const authorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: requestBody,
    });

  typia.assert(authorized); // Full runtime type validation

  // Business logic validation
  TestValidator.equals(
    "response email matches request email",
    authorized.email,
    email,
  );

  // Validate id is a valid UUID
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );

  // Validate password_hash existence and type
  TestValidator.predicate(
    "password_hash is non-empty string",
    typeof authorized.password_hash === "string" &&
      authorized.password_hash.length > 0,
  );

  // Validate created_at and updated_at are ISO 8601 date-time strings
  const iso8601Pattern =
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/;
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    iso8601Pattern.test(authorized.created_at),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    iso8601Pattern.test(authorized.updated_at),
  );

  // Validate deleted_at is either null or undefined if present
  TestValidator.predicate(
    "deleted_at is null or undefined",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // Validate token properties
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time",
    iso8601Pattern.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time",
    iso8601Pattern.test(authorized.token.refreshable_until),
  );
}
