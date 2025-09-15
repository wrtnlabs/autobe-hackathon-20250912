import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * End-to-End Test for Chatbot Member Deletion by Admin
 *
 * This test validates the full lifecycle of deleting a chatbot member by an
 * admin user. It covers the creation and authentication of both admin and
 * member users, the deletion operation by the admin, and verification of
 * deletion effectiveness.
 *
 * The test also ensures proper authorization boundaries by verifying that
 * non-admin users cannot perform deletion and that invalid or non-existent
 * IDs are handled correctly.
 *
 * Steps:
 *
 * 1. Admin user registration (join) and login
 * 2. Chatbot member registration (join) and login
 * 3. Admin deletes the chatbot member by ID
 * 4. Confirm the member is deleted and not retrievable
 * 5. Validate unauthorized deletion attempts from non-admin users fail
 * 6. Validate error handling for non-existent UUIDs
 */
export async function test_api_chatbot_member_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and login
  const adminInternalSenderId = RandomGenerator.alphaNumeric(16);
  const adminNickname = RandomGenerator.name();
  const adminCreateBody = {
    internal_sender_id: adminInternalSenderId,
    nickname: adminNickname,
  } satisfies IChatbotAdmin.ICreate;

  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // After join, admin is automatically authorized (token set in connection headers)
  // But to simulate role switching, we explicitly login again (role switching simulation)

  const adminLoginBody = {
    internal_sender_id: adminInternalSenderId,
    nickname: adminNickname,
  } satisfies IChatbotAdmin.ILogin;

  const adminLoginAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // Step 2: Chatbot member registration and login
  const memberInternalSenderId = RandomGenerator.alphaNumeric(16);
  const memberNickname = RandomGenerator.name();
  const memberCreateBody = {
    internal_sender_id: memberInternalSenderId,
    nickname: memberNickname,
  } satisfies IChatbotMember.ICreate;

  // Create chatbot member
  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // Login the member explicitly (simulate role switching)
  const memberLoginBody = {
    internal_sender_id: memberInternalSenderId,
    nickname: memberNickname,
  } satisfies IChatbotMember.ILogin;

  const memberLoginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // Step 3: Admin deletes the chatbot member
  // First, switch role back to admin by login again
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  await api.functional.chatbot.admin.chatbotMembers.erase(connection, {
    id: memberAuthorized.id,
  });

  // Step 4: Confirm member is deleted - trying to fetch member should fail with error
  // Since there's no fetch member endpoint provided, simulate the member login and expect error
  await TestValidator.error(
    "member login after deletion should fail",
    async () => {
      await api.functional.auth.member.login.loginMember(connection, {
        body: memberLoginBody,
      });
    },
  );

  // Step 5: Validate unauthorized deletion attempts from non-admin user fail
  // Switch role to member
  await api.functional.auth.member.login.loginMember(connection, {
    body: memberLoginBody,
  });

  await TestValidator.error("member cannot delete chatbot member", async () => {
    await api.functional.chatbot.admin.chatbotMembers.erase(connection, {
      id: memberAuthorized.id,
    });
  });

  // Step 6: Validate error handling for non-existent UUID
  const randomNonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot delete non-existent member UUID",
    async () => {
      await api.functional.chatbot.admin.chatbotMembers.erase(connection, {
        id: randomNonExistentUUID,
      });
    },
  );
}
