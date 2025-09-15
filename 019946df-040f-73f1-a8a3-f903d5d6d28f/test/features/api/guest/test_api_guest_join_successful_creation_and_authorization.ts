import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

export async function test_api_guest_join_successful_creation_and_authorization(
  connection: api.IConnection,
) {
  // 1. Construct a valid guest create request
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  // 2. Call API to join guest
  const authorized: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 3. Validate returned authorized guest user data and tokens
  TestValidator.equals(
    "tenant_id matches",
    authorized.tenant_id,
    createBody.tenant_id,
  );
  TestValidator.equals("email matches", authorized.email, createBody.email);
  TestValidator.equals(
    "first_name matches",
    authorized.first_name,
    createBody.first_name,
  );
  TestValidator.equals(
    "last_name matches",
    authorized.last_name,
    createBody.last_name,
  );
  TestValidator.equals("status is active", authorized.status, "active");

  // Token checks: token object presence and access token string presence
  TestValidator.predicate(
    "access token is present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access/refresh expiration are valid ISO date strings",
    typeof authorized.token.expired_at === "string" &&
      !isNaN(Date.parse(authorized.token.expired_at)) &&
      typeof authorized.token.refreshable_until === "string" &&
      !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // 4. Attempt to join again with same email to test duplicate email rejection
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.guest.join(connection, {
      body: {
        ...createBody,
        // Same email
        email: createBody.email,
      } satisfies IEnterpriseLmsGuest.ICreate,
    });
  });
}
