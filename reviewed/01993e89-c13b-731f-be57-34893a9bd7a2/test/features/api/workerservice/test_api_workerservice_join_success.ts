import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";

export async function test_api_workerservice_join_success(
  connection: api.IConnection,
) {
  // Generate a valid random email using typia
  const email = typia.random<string & tags.Format<"email">>();
  // Generate a hash-like random alpha-numeric string for password_hash
  const password_hash = RandomGenerator.alphaNumeric(64);

  // Compose the request body adhering to schema
  const requestBody = {
    email: email,
    password_hash: password_hash,
  } satisfies INotificationWorkflowWorkerService.ICreate;

  // Call the join API function
  const authorized: INotificationWorkflowWorkerService.IAuthorized =
    await api.functional.auth.workerService.join(connection, {
      body: requestBody,
    });

  // Assert the response structure and types
  typia.assert(authorized);

  // Check essential properties with TestValidator
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals("email matches request email", authorized.email, email);
  TestValidator.predicate(
    "password_hash is a non-empty string",
    typeof authorized.password_hash === "string" &&
      authorized.password_hash.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      authorized.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      authorized.updated_at,
    ),
  );

  // deleted_at may be null, undefined or ISO date-time string
  if (authorized.deleted_at !== null && authorized.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        authorized.deleted_at,
      ),
    );
  }

  // Check token object presence and properties
  TestValidator.predicate(
    "token is object",
    typeof authorized.token === "object" && authorized.token !== null,
  );
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
    "token.expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      authorized.token.refreshable_until,
    ),
  );
}
