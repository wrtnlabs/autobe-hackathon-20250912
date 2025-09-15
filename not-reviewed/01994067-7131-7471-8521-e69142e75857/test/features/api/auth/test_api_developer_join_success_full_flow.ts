import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

export async function test_api_developer_join_success_full_flow(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique email and password_hash for testing
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(32);
  const requestBody = {
    email,
    email_verified: false,
    password_hash: passwordHash,
  } satisfies IOauthServerDeveloper.ICreate;

  // Step 2: Attempt to join as a new developer
  const authorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, { body: requestBody });
  typia.assert(authorized);

  // Step 3: Validate the returned information
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.predicate(
    "email_verified is false",
    authorized.email_verified === false,
  );
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    !isNaN(Date.parse(authorized.updated_at)),
  );

  // Confirm deleted_at is either null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // Validate token structure
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601",
    !isNaN(Date.parse(token.refreshable_until)),
  );

  // Step 4: Attempt to join again with the same email and expect error
  await TestValidator.error("duplicate email join should fail", async () => {
    await api.functional.auth.developer.join(connection, { body: requestBody });
  });
}
