import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";

/**
 * This test validates the update functionality of a chatbot user title
 * assignment by an authenticated member user.
 *
 * Steps included:
 *
 * 1. Register and authenticate a member user.
 * 2. Simulate or generate an existing user title assignment for that member.
 * 3. Update the user title assignment record via the API, changing title and
 *    assignment date.
 * 4. Validate responses to ensure updates persisted correctly.
 * 5. Test unauthorized update attempt without authentication, expecting failure.
 */
export async function test_api_user_title_update_for_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const memberRequestBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberRequestBody,
    });
  typia.assert(authorizedMember);

  // 2. Simulate an existing user title assignment
  const existingUserTitle: IChatbotUserTitle =
    typia.random<IChatbotUserTitle>();
  // Ensure the user title belongs to the authenticated member
  existingUserTitle.chatbot_member_id = authorizedMember.id;

  // Use the existing user title id
  const memberId: string = authorizedMember.id;
  const userTitleId: string = existingUserTitle.id;

  // 3. Prepare update request body
  const newChatbotTitleId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const newAssignedAt: string = new Date().toISOString();

  const updateRequestBody = {
    chatbot_title_id: newChatbotTitleId,
    assigned_at: newAssignedAt,
  } satisfies IChatbotUserTitle.IUpdate;

  // 4. Call the update API
  const updatedUserTitle: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.update(
      connection,
      {
        memberId,
        userTitleId,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedUserTitle);

  // 5. Validate the updated data
  TestValidator.equals(
    "Updated user title id",
    updatedUserTitle.id,
    userTitleId,
  );
  TestValidator.equals(
    "Updated member id",
    updatedUserTitle.chatbot_member_id,
    memberId,
  );
  TestValidator.equals(
    "Updated chatbot title id",
    updatedUserTitle.chatbot_title_id,
    newChatbotTitleId,
  );
  TestValidator.equals(
    "Updated assigned_at",
    updatedUserTitle.assigned_at,
    newAssignedAt,
  );

  // 6. Unauthorized update attempt
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized update should be rejected",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.update(
        unauthConnection,
        {
          memberId,
          userTitleId,
          body: updateRequestBody,
        },
      );
    },
  );
}
