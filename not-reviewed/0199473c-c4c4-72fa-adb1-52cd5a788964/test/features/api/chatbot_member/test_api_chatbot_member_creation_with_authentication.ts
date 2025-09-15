import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * This End-to-End test validates the full workflow of creating and
 * authenticating a new chatbot member user account, followed by creating the
 * chatbot member record. The test begins with user registration (join) via the
 * /auth/member/join endpoint, providing a unique internal_sender_id and a
 * nickname. It ensures the response returns an authorized user object including
 * JWT tokens for authentication. Then, it authenticates the session with the
 * tokens provided by the join operation automatically handled by the SDK, and
 * proceeds to create a chatbot member record at /chatbot/member/chatbotMembers
 * with the same internal_sender_id and nickname. The created chatbot member
 * must have a unique UUID and timestamps created_at and updated_at. The test
 * also verifies that the join issued valid tokens and that the chatbot member
 * creation response aligns with the registration data. Business rules enforced
 * include uniqueness of internal_sender_id and the presence of nickname. Error
 * scenarios like duplicate internal_sender_id or missing fields are
 * acknowledged but not explicitly tested here due to DTO and API function
 * constraints. The test ensures type safety with typia.assert calls and uses
 * realistic random values for fields respecting expected formats and
 * uniqueness. All API calls are awaited with proper parameter structure. This
 * verifies that a member user is properly created, authorized, and associated
 * with a chatbot member record in the system, aligning with the documented
 * business and security rules.
 */
export async function test_api_chatbot_member_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new member user account with unique internal_sender_id and nickname
  // Generate a unique internal_sender_id and nickname
  const internalSenderId = `${RandomGenerator.alphaNumeric(5)}-${Date.now()}`;
  const nickname = RandomGenerator.name(2);

  // Prepare join request body
  const joinRequestBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotMember.ICreate;

  // Call joinMember API for registration and authentication
  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedMember);

  // Validate response fields
  TestValidator.predicate(
    "Join response contains valid access token",
    typeof authorizedMember.token.access === "string" &&
      authorizedMember.token.access.length > 0,
  );
  TestValidator.equals(
    "Join response internal_sender_id matches request",
    authorizedMember.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "Join response nickname matches request",
    authorizedMember.nickname,
    nickname,
  );

  // 2. Using authentication from join, create a chatbot member record
  const createMemberRequestBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotMember.ICreate;

  // Call create chatbot member
  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: createMemberRequestBody,
    });
  typia.assert(chatbotMember);

  // Validate created member fields
  TestValidator.equals(
    "Chatbot member internal_sender_id matches",
    chatbotMember.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "Chatbot member nickname matches",
    chatbotMember.nickname,
    nickname,
  );
  TestValidator.predicate(
    "Chatbot member id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      chatbotMember.id,
    ),
  );
  TestValidator.predicate(
    "Chatbot member created_at is ISO date-time",
    !isNaN(Date.parse(chatbotMember.created_at)),
  );
  TestValidator.predicate(
    "Chatbot member updated_at is ISO date-time",
    !isNaN(Date.parse(chatbotMember.updated_at)),
  );

  // deleted_at can be null or undefined, no need to validate explicitly
}
