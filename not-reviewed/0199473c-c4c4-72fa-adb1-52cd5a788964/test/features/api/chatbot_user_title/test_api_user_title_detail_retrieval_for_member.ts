import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";

/**
 * This test validates retrieval of detailed information for a specific
 * chatbot user title assigned to a member using the GET
 * /chatbot/member/chatbotMembers/{memberId}/userTitles/{userTitleId}
 * endpoint.
 *
 * The test includes the following steps:
 *
 * 1. Register and authenticate a new chatbot member user via /auth/member/join
 *    endpoint to receive authorized member data including memberId.
 * 2. Attempt to retrieve detailed user title info for the member using valid
 *    and invalid userTitleId values.
 * 3. Validate the full user title entity response against expected properties.
 * 4. Cover error scenarios for invalid memberId, invalid userTitleId, and
 *    unauthorized access.
 *
 * This flow ensures coverage of success, failure, and access control
 * behaviors using SDK's simulate mode for sample data.
 */
export async function test_api_user_title_detail_retrieval_for_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user via join API
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(2),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Prepare a random userTitleId for error and unauthenticated tests
  const randomUserTitleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Test expected error on non-existent userTitleId (most likely 404 error)
  await TestValidator.error(
    "fetching non-existent userTitle should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.at(
        connection,
        {
          memberId: member.id,
          userTitleId: randomUserTitleId,
        },
      );
    },
  );

  // 4. Test successful fetch scenario with SDK simulate mode
  const simulatedConn: api.IConnection = { ...connection, simulate: true };
  const userTitle: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.at(
      simulatedConn,
      {
        memberId: member.id,
        userTitleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(userTitle);
  TestValidator.equals(
    "userTitle memberId matches",
    userTitle.chatbot_member_id,
    member.id,
  );
  TestValidator.predicate(
    "userTitle contains required properties",
    userTitle.id !== undefined &&
      userTitle.chatbot_title_id !== undefined &&
      userTitle.assigned_at !== undefined &&
      userTitle.created_at !== undefined &&
      userTitle.updated_at !== undefined,
  );

  // 5. Test invalid memberId format (use string blatantly violating UUID format)
  await TestValidator.error(
    "fetching with invalid memberId format should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.at(
        connection,
        {
          memberId: "invalid-uuid-string-zzz",
          userTitleId: randomUserTitleId,
        },
      );
    },
  );

  // 6. Test invalid userTitleId format (similarly invalid UUID format string)
  await TestValidator.error(
    "fetching with invalid userTitleId format should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.at(
        connection,
        {
          memberId: member.id,
          userTitleId: "not-a-valid-uuid-xxx",
        },
      );
    },
  );

  // 7. Test unauthenticated access rejection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fetch should fail", async () => {
    await api.functional.chatbot.member.chatbotMembers.userTitles.at(
      unauthConn,
      {
        memberId: member.id,
        userTitleId: randomUserTitleId,
      },
    );
  });
}
