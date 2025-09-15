import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

/**
 * This test validates the deletion of a chatbot admin identified by UUID.
 *
 * Steps:
 *
 * 1. Create a new admin using /auth/admin/join.
 * 2. Login using /auth/admin/login.
 * 3. Delete created admin using DELETE /chatbot/admin/chatbotAdmins/{id}.
 * 4. Confirm deletion by attempting to delete the same admin again (since no get
 *    endpoint), expect an error.
 * 5. Test error handling with non-existent UUID.
 * 6. Test unauthorized attempts (no authentication) to delete.
 */
export async function test_api_chatbot_admin_deletion_by_id(
  connection: api.IConnection,
) {
  // 1. Create a chatbot admin user
  const createBody = {
    internal_sender_id: typia.random<string>(),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const createdAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(createdAdmin);

  // 2. Authenticate the created admin user to obtain token
  const loginBody = {
    internal_sender_id: createdAdmin.internal_sender_id,
    nickname: createdAdmin.nickname,
  } satisfies IChatbotAdmin.ILogin;
  const loggedInAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Delete the admin user by ID
  await api.functional.chatbot.admin.chatbotAdmins.erase(connection, {
    id: createdAdmin.id,
  });

  // 4. Confirm deletion by attempting to delete again - expect error
  await TestValidator.error(
    "retrieving deleted admin should fail with error",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.erase(connection, {
        id: createdAdmin.id,
      });
    },
  );

  // 5. Attempt deletion of non-existent but well-formed UUID - expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion with non-existent UUID should fail",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.erase(connection, {
        id: nonExistentId,
      });
    },
  );

  // 6. Attempt deletion without authentication - expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.erase(unauthConn, {
        id: nonExistentId,
      });
    },
  );
}
