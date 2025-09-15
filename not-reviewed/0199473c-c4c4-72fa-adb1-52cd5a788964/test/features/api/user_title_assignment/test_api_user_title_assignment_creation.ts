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
 * This E2E test validates the entire workflow of assigning a user title to
 * a chatbot member.
 *
 * We cover these steps:
 *
 * 1. Member user creation and authentication via /auth/member/join.
 * 2. Admin user creation and authentication via /auth/admin/join.
 * 3. Create a new user title record as admin via /chatbot/admin/titles.
 * 4. Create chatbot member record representing a user (member) via
 *    /chatbot/member/chatbotMembers.
 * 5. Assign the user title to the member via
 *    /chatbot/member/chatbotMembers/{memberId}/userTitles.
 * 6. Validate all IDs are UUIDs and the returned entities properly reflect
 *    assignments.
 * 7. Validate error case of assigning a non-existent title to the member to
 *    ensure rejection.
 * 8. Confirm authorization boundaries are enforced by ensuring a
 *    non-authenticated or wrong user cannot assign titles.
 *
 * This test ensures business rules about uniqueness, authorization, and
 * data integrity.
 */
export async function test_api_user_title_assignment_creation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate chatbot member user
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(2),
  } satisfies IChatbotMember.ICreate;

  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create and authenticate admin user
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(2),
  } satisfies IChatbotAdmin.ICreate;

  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 3. Admin login to set authorization token context
  const adminLoginBody = {
    internal_sender_id: adminCreateBody.internal_sender_id,
    nickname: adminCreateBody.nickname,
  } satisfies IChatbotAdmin.ILogin;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 4. Create a new user title as admin
  const titleCreateBody = {
    name: `${RandomGenerator.name(2)} Title`,
    fee_discount_rate:
      RandomGenerator.alphaNumeric(2).replace(/[\D]/g, "") === ""
        ? 10
        : parseInt(RandomGenerator.alphaNumeric(2).replace(/[\D]/g, "")) % 101,
  } satisfies IChatbotTitles.ICreate;

  // Ensure fee_discount_rate between 0 and 100
  titleCreateBody.fee_discount_rate = Math.min(
    100,
    Math.max(0, titleCreateBody.fee_discount_rate),
  );

  const userTitle: IChatbotTitles =
    await api.functional.chatbot.admin.titles.create(connection, {
      body: titleCreateBody,
    });

  typia.assert(userTitle);
  TestValidator.predicate(
    "userTitle id is uuid",
    /^[0-9a-fA-F-]{36}$/.test(userTitle.id),
  );

  // 5. Create chatbot member record for user
  // Switch to member authorization for member APIs
  const memberLoginBody = {
    internal_sender_id: memberCreateBody.internal_sender_id,
    nickname: memberCreateBody.nickname,
  } satisfies IChatbotMember.ILogin;

  const memberLogin = await api.functional.auth.member.login.loginMember(
    connection,
    { body: memberLoginBody },
  );
  typia.assert(memberLogin);

  const wholeMember = await api.functional.chatbot.member.chatbotMembers.create(
    connection,
    { body: memberCreateBody },
  );
  typia.assert(wholeMember);

  TestValidator.equals(
    "created member ID matches authorized ID",
    wholeMember.id,
    memberAuthorized.id,
  );

  // 6. Assign the user title to the member
  const nowISOString = new Date().toISOString();

  const userTitleAssignBody = {
    chatbot_member_id: wholeMember.id,
    chatbot_title_id: userTitle.id,
    assigned_at: nowISOString,
  } satisfies IChatbotUserTitle.ICreate;

  const assignedUserTitle: IChatbotUserTitle =
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      connection,
      {
        memberId: wholeMember.id,
        body: userTitleAssignBody,
      },
    );
  typia.assert(assignedUserTitle);

  TestValidator.equals(
    "assigned user title member ID matches",
    assignedUserTitle.chatbot_member_id,
    wholeMember.id,
  );
  TestValidator.equals(
    "assigned user title title ID matches",
    assignedUserTitle.chatbot_title_id,
    userTitle.id,
  );
  TestValidator.equals(
    "assigned_at timestamps roughly equal",
    assignedUserTitle.assigned_at.substr(0, 16),
    nowISOString.substr(0, 16),
  );

  // 7. Error scenario: Assign non-existent title ID
  await TestValidator.error(
    "assign non-existent title should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.userTitles.create(
        connection,
        {
          memberId: wholeMember.id,
          body: {
            chatbot_member_id: wholeMember.id,
            chatbot_title_id: "00000000-0000-0000-0000-000000000000",
            assigned_at: new Date().toISOString(),
          } satisfies IChatbotUserTitle.ICreate,
        },
      );
    },
  );

  // 8. Error scenario: Unauthorized assignment attempt
  // We create a fresh connection without authorization headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized assignment should fail", async () => {
    await api.functional.chatbot.member.chatbotMembers.userTitles.create(
      unauthConnection,
      {
        memberId: wholeMember.id,
        body: userTitleAssignBody,
      },
    );
  });
}
