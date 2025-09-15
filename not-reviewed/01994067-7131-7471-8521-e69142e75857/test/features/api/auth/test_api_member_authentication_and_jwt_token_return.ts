import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

export async function test_api_member_authentication_and_jwt_token_return(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user via /auth/member/join
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerMember.ICreate;

  const createdMember: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(createdMember);

  // Step 2: Login with correct credentials via /auth/member/login
  const loginBody = {
    email: memberCreateBody.email,
    password: memberCreateBody.password,
  } satisfies IOauthServerMember.ILogin;
  const loginResponse: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(loginResponse);

  // Validate member properties in login response
  TestValidator.predicate(
    "loginResponse.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
  TestValidator.equals(
    "loginResponse.email matches login email",
    loginResponse.email,
    loginBody.email,
  );
  TestValidator.predicate(
    "loginResponse.email_verified is boolean",
    typeof loginResponse.email_verified === "boolean",
  );
  TestValidator.predicate(
    "loginResponse.password_hash is string",
    typeof loginResponse.password_hash === "string",
  );
  // Validate ISO 8601 format for timestamps
  TestValidator.predicate(
    "loginResponse.created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      loginResponse.created_at,
    ),
  );
  TestValidator.predicate(
    "loginResponse.updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      loginResponse.updated_at,
    ),
  );

  // Validate token structure
  TestValidator.predicate(
    "login token.access is string",
    typeof loginResponse.token.access === "string",
  );
  TestValidator.predicate(
    "login token.refresh is string",
    typeof loginResponse.token.refresh === "string",
  );
  TestValidator.predicate(
    "login token.expired_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      loginResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "login token.refreshable_until is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      loginResponse.token.refreshable_until,
    ),
  );

  // Step 3: Attempt login with wrong email - expect error
  await TestValidator.error("login fails with incorrect email", async () => {
    const badEmailBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberCreateBody.password,
    } satisfies IOauthServerMember.ILogin;
    if (badEmailBody.email === memberCreateBody.email) {
      // Just in rare chance random generated same email, mutate
      badEmailBody.email = `x${badEmailBody.email}`;
    }
    await api.functional.auth.member.login(connection, { body: badEmailBody });
  });

  // Step 4: Attempt login with wrong password - expect error
  await TestValidator.error("login fails with incorrect password", async () => {
    const badPasswordBody = {
      email: memberCreateBody.email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IOauthServerMember.ILogin;
    if (badPasswordBody.password === memberCreateBody.password) {
      badPasswordBody.password = `x${badPasswordBody.password}`;
    }
    await api.functional.auth.member.login(connection, {
      body: badPasswordBody,
    });
  });
}
