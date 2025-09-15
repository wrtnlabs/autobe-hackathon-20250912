import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotCommandLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotCommandLog";

export async function test_api_chatbot_command_log_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminPayload = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminPayload,
    },
  );
  typia.assert(admin);

  // 2. Failure retrieving non-existent ID (simulate UUID but not existing ID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent chatbot command log id should fail",
    async () => {
      await api.functional.chatbot.admin.chatbotCommandLogs.at(connection, {
        chatbotCommandLogId: nonExistentId,
      });
    },
  );

  // 3. Failure retrieving without admin authentication
  // Create unauthorized connection (empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "retrieving chatbot command log without authentication should fail",
    async () => {
      await api.functional.chatbot.admin.chatbotCommandLogs.at(
        unauthConnection,
        {
          chatbotCommandLogId: nonExistentId,
        },
      );
    },
  );
}
