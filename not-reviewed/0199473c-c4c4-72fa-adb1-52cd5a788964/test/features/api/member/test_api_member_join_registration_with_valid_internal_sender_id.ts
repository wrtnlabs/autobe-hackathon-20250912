import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * Test member registration endpoint '/auth/member/join' with valid
 * internal_sender_id.
 *
 * This test validates the entire join workflow:
 *
 * 1. Post a new member registration with a unique internal_sender_id and
 *    nickname.
 * 2. Verify the response is a fully authorized member object including JWT
 *    tokens.
 * 3. Assert that returned internal_sender_id matches the request value.
 * 4. Confirm token properties are present and valid strings.
 * 5. Attempt to register a member with duplicate internal_sender_id and
 *    validate error is thrown.
 * 6. Attempt to register a member with empty nickname and validate proper
 *    error.
 */
export async function test_api_member_join_registration_with_valid_internal_sender_id(
  connection: api.IConnection,
) {
  // Step 1: Register new member with unique internal_sender_id
  const internalSenderId = RandomGenerator.alphaNumeric(20);
  const nickname = RandomGenerator.name(2);
  const requestBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotMember.ICreate;

  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: requestBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Validate internal_sender_id matches
  TestValidator.equals(
    "Member internal_sender_id matches request",
    authorizedMember.internal_sender_id,
    internalSenderId,
  );

  // Step 3: Validate nickname matches
  TestValidator.equals(
    "Member nickname matches request",
    authorizedMember.nickname,
    nickname,
  );

  // Step 4: Validate token presence and types
  const token: IAuthorizationToken = authorizedMember.token;
  typia.assert(token);
  TestValidator.predicate(
    "Access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at is ISO date-time string",
    typeof token.expired_at === "string" &&
      !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "Token refreshable_until is ISO date-time string",
    typeof token.refreshable_until === "string" &&
      !isNaN(Date.parse(token.refreshable_until)),
  );

  // Step 5: Attempt to register with duplicate internal_sender_id - should error
  await TestValidator.error(
    "Duplicate internal_sender_id registration fails",
    async () => {
      await api.functional.auth.member.join.joinMember(connection, {
        body: {
          internal_sender_id: internalSenderId,
          nickname: RandomGenerator.name(2),
        } satisfies IChatbotMember.ICreate,
      });
    },
  );

  // Step 6: Attempt to register with empty nickname - should error
  await TestValidator.error("Empty nickname registration fails", async () => {
    await api.functional.auth.member.join.joinMember(connection, {
      body: {
        internal_sender_id: RandomGenerator.alphaNumeric(20),
        nickname: "",
      } satisfies IChatbotMember.ICreate,
    });
  });
}
