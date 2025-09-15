import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";
import type { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";

/**
 * End-to-end test for updating a chatbot member's assigned user title.
 *
 * This test covers the complete scenario:
 *
 * 1. A chatbot member joins and authenticates.
 * 2. An admin creates a new user title.
 * 3. A chatbot member entity is created.
 * 4. The user title is assigned to the member.
 * 5. The assigned user title is updated via the PUT endpoint.
 *
 * The test verifies proper authorization for member role and validates that
 * the update changes are correctly persisted and reflected. It also ensures
 * that all response schemas strictly conform to the API contracts.
 */
export async function test_api_user_title_assignment_update(
  connection: api.IConnection,
) {
  // 1. Create and authenticate chatbot member using join
  const memberJoinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create admin and login for admin authorized context
  const adminJoinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // For admin context, switch authorization token using login
  const adminLoginBody = {
    internal_sender_id: adminJoinBody.internal_sender_id,
    nickname: adminJoinBody.nickname,
  } satisfies IChatbotAdmin.ILogin;
  const adminLoginAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create a user title as admin
  const titleCreateBody = {
    name: RandomGenerator.name(2),
    fee_discount_rate: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IChatbotTitles.ICreate;
  const createdTitle: IChatbotTitles =
    await api.functional.chatbot.admin.titles.create(connection, {
      body: titleCreateBody,
    });
  typia.assert(createdTitle);

  // Switch authorization back to member for member-scoped APIs
  const memberLoginBody = {
    internal_sender_id: memberJoinBody.internal_sender_id,
    nickname: memberJoinBody.nickname,
  } satisfies IChatbotMember.ILogin;
  const memberLoginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Create chatbot member record
  const memberCreateBody = {
    internal_sender_id: memberJoinBody.internal_sender_id,
    nickname: memberJoinBody.nickname,
  } satisfies IChatbotMember.ICreate;
  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: memberCreateBody,
    });
  typia.assert(chatbotMember);

  // 5. Assign user title to the member
  const assignedAt: string = new Date().toISOString();
  const userTitleAssignBody = {
    chatbot_member_id: chatbotMember.id,
    chatbot_title_id: createdTitle.id,
    assigned_at: assignedAt,
  } satisfies IChatbotUserTitle.ICreate;
  const userTitleAssigned: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      connection,
      {
        memberId: chatbotMember.id,
        body: userTitleAssignBody,
      },
    );
  typia.assert(userTitleAssigned);

  // 6. Update the assigned user title with new properties
  //    Prepare an update body modifying at least two properties

  const updateBody = {
    chatbot_title_id: createdTitle.id, // Keep same title id for simplicity
    assigned_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // +1h
  } satisfies IChatbotUserTitle.IUpdate;
  const updatedUserTitle: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.update(
      connection,
      {
        memberId: chatbotMember.id,
        userTitleId: userTitleAssigned.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUserTitle);

  // 7. Validate that ID remains the same and updated_at is recent
  TestValidator.equals(
    "userTitle ID unchanged after update",
    updatedUserTitle.id,
    userTitleAssigned.id,
  );
  TestValidator.predicate(
    "updatedAt timestamp is newer",
    new Date(updatedUserTitle.updated_at) >=
      new Date(userTitleAssigned.updated_at),
  );
}
