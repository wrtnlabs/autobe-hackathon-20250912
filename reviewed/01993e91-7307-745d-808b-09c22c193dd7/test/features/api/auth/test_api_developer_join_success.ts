import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";

export async function test_api_developer_join_success(
  connection: api.IConnection,
) {
  // 1. Generate unique email and developer data
  const email = `dev_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate hashed password
  const name = RandomGenerator.name();

  const requestBody = {
    email: email,
    password_hash: passwordHash,
    name: name,
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  // 2. Call developer join API
  const authorizedDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: requestBody,
    });

  // 3. Validate response is of correct type
  typia.assert(authorizedDeveloper);

  // 4. Check key response fields
  TestValidator.equals("email matches input", authorizedDeveloper.email, email);

  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedDeveloper.id,
    ),
  );

  TestValidator.predicate(
    "token.access is non-empty",
    typeof authorizedDeveloper.token.access === "string" &&
      authorizedDeveloper.token.access.length > 0,
  );

  TestValidator.predicate(
    "token.refresh is non-empty",
    typeof authorizedDeveloper.token.refresh === "string" &&
      authorizedDeveloper.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.expired_at is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      authorizedDeveloper.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      authorizedDeveloper.token.refreshable_until,
    ),
  );
}
