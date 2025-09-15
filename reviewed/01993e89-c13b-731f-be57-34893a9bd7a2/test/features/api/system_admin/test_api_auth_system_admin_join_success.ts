import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

export async function test_api_auth_system_admin_join_success(
  connection: api.IConnection,
) {
  // 1. Generate request body with valid email and password
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = RandomGenerator.alphaNumeric(10);
  const requestBody = {
    email,
    password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  // 2. Call the join API for systemAdmin
  const response = await api.functional.auth.systemAdmin.join(connection, {
    body: requestBody,
  });

  // 3. Assert response type correctness
  typia.assert(response);

  // 4. Validate that the response has expected values
  TestValidator.predicate("response has non-empty id", response.id.length > 0);
  TestValidator.equals(
    "response email matches request email",
    response.email,
    email,
  );
  TestValidator.predicate(
    "response password_hash is non-empty",
    response.password_hash.length > 0,
  );
  TestValidator.predicate(
    "response created_at is valid ISO datetime",
    !Number.isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "response updated_at is valid ISO datetime",
    !Number.isNaN(Date.parse(response.updated_at)),
  );

  const token = response.token;
  TestValidator.predicate(
    "token access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO datetime",
    !Number.isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO datetime",
    !Number.isNaN(Date.parse(token.refreshable_until)),
  );
}
