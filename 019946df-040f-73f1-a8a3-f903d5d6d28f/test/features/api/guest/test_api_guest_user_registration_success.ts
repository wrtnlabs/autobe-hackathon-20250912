import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

export async function test_api_guest_user_registration_success(
  connection: api.IConnection,
) {
  // Generate realistic guest create input data
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  // Call join API for guest user
  const response: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: createBody });

  // Validate response structure
  typia.assert(response);

  // Check that response email matches create input
  TestValidator.equals(
    "registered email matches create",
    response.email,
    createBody.email,
  );

  // Check status is active
  TestValidator.equals("account status is active", response.status, "active");

  // Check that tokens are present and non-empty strings
  TestValidator.predicate(
    "access_token present",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh_token present",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Optional tokens access_token and refresh_token on response itself are strings when present
  if (response.access_token !== undefined) {
    TestValidator.predicate(
      "access_token string present in response",
      typeof response.access_token === "string" &&
        response.access_token.length > 0,
    );
  }
  if (response.refresh_token !== undefined) {
    TestValidator.predicate(
      "refresh_token string present in response",
      typeof response.refresh_token === "string" &&
        response.refresh_token.length > 0,
    );
  }
}
