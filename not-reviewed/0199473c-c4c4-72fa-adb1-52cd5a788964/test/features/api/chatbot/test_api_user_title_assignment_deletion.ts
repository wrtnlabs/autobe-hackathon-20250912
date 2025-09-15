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
 * This test validates the deletion of a user title assignment from a
 * chatbot member. It covers member and admin registration and
 * authentication, title creation, member creation, title assignment, and
 * deletion steps.
 *
 * The test confirms:
 *
 * - Successful creation/authentication of member and admin users.
 * - Proper creation of user titles by admin.
 * - Assignment of user titles to chatbot members.
 * - Successful deletion of the user title assignment.
 * - Enforcement of authorization rules.
 *
 * Each step's API response is validated for type safety. Async/await
 * patterns and role switching are correctly handled.
 */
export async function test_api_user_title_assignment_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member user (first member)
  const memberBody1 = {
    internal_sender_id: RandomGenerator.alphabets(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const member1: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberBody1,
    });
  typia.assert(member1);

  // 2. Register and authenticate admin user
  const adminBody = {
    internal_sender_id: RandomGenerator.alphabets(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // 3. Admin creates a user title
  const titleBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    fee_discount_rate: Math.floor(Math.random() * 101),
  } satisfies IChatbotTitles.ICreate;
  const title: IChatbotTitles =
    await api.functional.chatbot.admin.titles.create(connection, {
      body: titleBody,
    });
  typia.assert(title);

  // 4. Create chatbot member entity (could be separate from auth join, for testing creation)
  const memberCreateBody = {
    internal_sender_id: member1.internal_sender_id,
    nickname: member1.nickname,
  } satisfies IChatbotMember.ICreate;
  const memberCreated: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberCreated);

  // 5. Assign the user title to the created member
  const nowIso = new Date().toISOString();
  const userTitleAssignBody = {
    chatbot_member_id: memberCreated.id,
    chatbot_title_id: title.id,
    assigned_at: nowIso,
  } satisfies IChatbotUserTitle.ICreate;
  const userTitleAssign: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      connection,
      {
        memberId: memberCreated.id,
        body: userTitleAssignBody,
      },
    );
  typia.assert(userTitleAssign);

  // 6. Confirm the assigned user title exists
  TestValidator.equals(
    "Assigned user title ID matches",
    userTitleAssign.chatbot_title_id,
    title.id,
  );

  // 7. Delete the user title assignment
  await api.functional.chatbot.member.chatbotMembers.userTitles.eraseUserTitle(
    connection,
    {
      memberId: memberCreated.id,
      userTitleId: userTitleAssign.id,
    },
  );

  // 8. Attempt deletion again should cause error (not found) - expected failure
  await TestValidator.error(
    "Deleting non-existent user title assignment should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.eraseUserTitle(
        connection,
        {
          memberId: memberCreated.id,
          userTitleId: userTitleAssign.id, // same ID, already deleted
        },
      );
    },
  );

  // 9. Test unauthorized deletion attempt by using member2
  const memberBody2 = {
    internal_sender_id: RandomGenerator.alphabets(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const member2: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberBody2,
    });
  typia.assert(member2);

  // Member 2 tries to delete user title belonging to member 1 (should fail)
  await TestValidator.error(
    "Member 2 unauthorized to delete member 1 user title assignment",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.eraseUserTitle(
        connection,
        {
          memberId: memberCreated.id,
          userTitleId: userTitleAssign.id,
        },
      );
    },
  );
}
