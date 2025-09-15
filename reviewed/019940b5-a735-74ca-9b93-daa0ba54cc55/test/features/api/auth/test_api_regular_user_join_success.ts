import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_regular_user_join_success(
  connection: api.IConnection,
) {
  // Prepare request body with mandatory and optional fields
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // simulated hashed password
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  // Call the joinRegularUser API endpoint
  const output: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: requestBody,
    });
  typia.assert(output);

  // Validate that the output fields match the request and expected structure
  TestValidator.equals(
    "email should match request body",
    output.email,
    requestBody.email,
  );
  TestValidator.equals(
    "full_name should match request body",
    output.full_name,
    requestBody.full_name,
  );
  TestValidator.equals(
    "email_verified should be false at join",
    output.email_verified,
    requestBody.email_verified,
  );
  TestValidator.equals(
    "phone_number should be null",
    output.phone_number,
    null,
  );
  TestValidator.equals(
    "profile_picture_url should be null",
    output.profile_picture_url,
    null,
  );

  // Validate token presence and format consistency
  TestValidator.predicate(
    "access token is non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
}
