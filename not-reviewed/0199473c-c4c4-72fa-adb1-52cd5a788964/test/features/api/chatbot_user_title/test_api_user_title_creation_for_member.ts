import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";

/**
 * E2E test for chatbot user title creation API.
 *
 * This test covers the scenario of registering a new chatbot member user,
 * authenticating them, and assigning a user title. It validates successful
 * creation, error handling for invalid references, duplicate assignments, and
 * authorization enforcement.
 */
export async function test_api_user_title_creation_for_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new chatbot member user
  const joinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: joinBody,
    });
  typia.assert(member);

  TestValidator.predicate(
    "member has valid id",
    typeof member.id === "string" && member.id.length > 0,
  );

  // Prepare values for creation
  const validTitleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const assignedAt = new Date().toISOString();

  // 2. Create a valid user title assignment for the member
  const createBody = {
    chatbot_member_id: member.id,
    chatbot_title_id: validTitleId,
    assigned_at: assignedAt,
  } satisfies IChatbotUserTitle.ICreate;

  const userTitle: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      connection,
      {
        memberId: member.id,
        body: createBody,
      },
    );
  typia.assert(userTitle);

  // Validate returned user title is linked to the member and title
  TestValidator.equals(
    "user title member ID matches",
    userTitle.chatbot_member_id,
    member.id,
  );
  TestValidator.equals(
    "user title title ID matches",
    userTitle.chatbot_title_id,
    validTitleId,
  );
  TestValidator.predicate(
    "user title assigned_at matches",
    userTitle.assigned_at === assignedAt,
  );

  // --- Error scenarios ---

  // 3. Invalid memberId (non-existent) should cause error
  const fakeMemberId = typia.random<string & tags.Format<"uuid">>();
  const createBodyWithFakeMember = {
    chatbot_member_id: fakeMemberId,
    chatbot_title_id: validTitleId,
    assigned_at: assignedAt,
  } satisfies IChatbotUserTitle.ICreate;

  await TestValidator.error("invalid memberId causes error", async () => {
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      connection,
      {
        memberId: fakeMemberId,
        body: createBodyWithFakeMember,
      },
    );
  });

  // 4. Invalid chatbot_title_id (random UUID) but valid member ID
  const fakeTitleId = typia.random<string & tags.Format<"uuid">>();
  const createBodyWithFakeTitle = {
    chatbot_member_id: member.id,
    chatbot_title_id: fakeTitleId,
    assigned_at: assignedAt,
  } satisfies IChatbotUserTitle.ICreate;

  await TestValidator.error(
    "invalid chatbot_title_id causes error",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.create(
        connection,
        {
          memberId: member.id,
          body: createBodyWithFakeTitle,
        },
      );
    },
  );

  // 5. Duplicate user title assignment (same memberId and titleId) should cause error
  // First creation was already done above
  await TestValidator.error(
    "duplicate user title assignment causes error",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.create(
        connection,
        {
          memberId: member.id,
          body: createBody,
        },
      );
    },
  );

  // 6. Attempt creation without authentication
  // Create a new unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access causes error", async () => {
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      unauthConn,
      {
        memberId: member.id,
        body: createBody,
      },
    );
  });
}
