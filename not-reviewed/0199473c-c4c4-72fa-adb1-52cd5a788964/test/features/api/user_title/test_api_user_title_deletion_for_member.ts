import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

export async function test_api_user_title_deletion_for_member(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member user
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(authorizedMember);

  // Use the authenticated member's ID for requests
  const memberId = authorizedMember.id;

  // Generate a userTitleId UUID to use in deletion tests
  const userTitleId = typia.random<string & tags.Format<"uuid">>();

  // Step 2-3: Delete the user title association successfully
  await api.functional.chatbot.member.chatbotMembers.userTitles.eraseUserTitle(
    connection,
    {
      memberId,
      userTitleId,
    },
  );

  // Step 4: Attempt to delete a different non-existent user title and expect error
  await TestValidator.error(
    "deleting non-existent user title should throw error",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.eraseUserTitle(
        connection,
        {
          memberId,
          userTitleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 5: Attempt deletion without authentication, expect error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "deleting user title without authorization should throw error",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.eraseUserTitle(
        unauthenticatedConnection,
        {
          memberId,
          userTitleId,
        },
      );
    },
  );
}
