import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

export async function test_api_admin_join_and_authentication_tokens_issue(
  connection: api.IConnection,
) {
  // Create the admin join request body with realistic data
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64), // 64-char hex string simulating hash
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  // Call the join endpoint API
  const output: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body,
    });

  // Assert full response type safety
  typia.assert(output);

  // Validate essential fields
  TestValidator.predicate(
    "email is valid email format",
    /.+@.+\..+/.test(output.email),
  );
  TestValidator.predicate(
    "access token present",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "email verified flag is true",
    output.email_verified === true,
  );
}
