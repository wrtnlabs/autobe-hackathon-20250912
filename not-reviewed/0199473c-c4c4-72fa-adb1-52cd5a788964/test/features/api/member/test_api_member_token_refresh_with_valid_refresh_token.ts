import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * This E2E test validates the token refresh lifecycle for a member user. It
 * covers member registration, login, refresh token submission, validation of
 * new tokens and proper error handling for invalid tokens.
 *
 * The test performs user creation, authentication, token refresh, and error
 * scenario testing with precise type safety and API response validation.
 */
export async function test_api_member_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user to obtain initial authorized info and tokens
  const createBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: createBody,
    });
  typia.assert(authorizedMember);

  // Validate member info and tokens presence
  TestValidator.predicate(
    "member id is not empty",
    typeof authorizedMember.id === "string" && authorizedMember.id.length > 0,
  );
  TestValidator.predicate(
    "token.access is not empty",
    typeof authorizedMember.token.access === "string" &&
      authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is not empty",
    typeof authorizedMember.token.refresh === "string" &&
      authorizedMember.token.refresh.length > 0,
  );

  // Step 2: Login as the same member to get fresh token info
  const loginBody = {
    internal_sender_id: createBody.internal_sender_id,
    nickname: createBody.nickname,
  } satisfies IChatbotMember.ILogin;

  const loginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // Validate login response tokens
  TestValidator.predicate(
    "login token.access is not empty",
    typeof loginAuthorized.token.access === "string" &&
      loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is not empty",
    typeof loginAuthorized.token.refresh === "string" &&
      loginAuthorized.token.refresh.length > 0,
  );

  // Step 3: Use the refresh token to obtain new authorized tokens
  const refreshBody = {
    refresh_token: loginAuthorized.token.refresh,
  } satisfies IChatbotMember.IRefresh;

  const refreshedAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.refresh.refreshMember(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuthorized);

  // Validate the refreshed tokens are present and different
  TestValidator.predicate(
    "refreshed token.access is new",
    refreshedAuthorized.token.access !== loginAuthorized.token.access,
  );
  TestValidator.predicate(
    "refreshed token.refresh is new",
    refreshedAuthorized.token.refresh !== loginAuthorized.token.refresh,
  );

  // Validate the member id is the same to ensure identity
  TestValidator.equals(
    "member id is consistent",
    refreshedAuthorized.id,
    loginAuthorized.id,
  );

  // Step 4: Test error scenarios: invalid refresh token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.member.refresh.refreshMember(connection, {
        body: {
          refresh_token: "invalid-token",
        } satisfies IChatbotMember.IRefresh,
      });
    },
  );

  // Step 5: Test error scenarios: missing refresh token (empty string)
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.member.refresh.refreshMember(connection, {
        body: { refresh_token: "" } satisfies IChatbotMember.IRefresh,
      });
    },
  );

  // Note: Cannot test expired/revoked tokens without backend support
}
