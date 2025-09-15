import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

export async function test_api_chatbot_admin_update_with_internal_sender_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first admin user
  const admin1CreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin1: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: admin1CreateBody,
    });
  typia.assert(admin1);

  // 2. Create second admin user (unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const admin2CreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin2: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(unauthConnection, {
      body: admin2CreateBody,
    });
  typia.assert(admin2);

  // 3. Authenticate as admin2 for update
  await api.functional.auth.admin.join(connection, { body: admin2CreateBody });

  // 4. Update admin2 nickname and internal_sender_id
  const updateBody: IChatbotAdmin.IUpdate = {
    nickname: RandomGenerator.name(),
    internal_sender_id: RandomGenerator.alphaNumeric(12),
  };

  const updatedAdmin: IChatbotAdmin =
    await api.functional.chatbot.admin.chatbotAdmins.update(connection, {
      id: admin2.id,
      body: updateBody,
    });
  typia.assert(updatedAdmin);

  TestValidator.equals(
    "updated nickname matches",
    updatedAdmin.nickname,
    updateBody.nickname,
  );

  TestValidator.equals(
    "updated internal_sender_id matches",
    updatedAdmin.internal_sender_id,
    updateBody.internal_sender_id,
  );

  // 5. Attempt update with duplicate internal_sender_id includes error
  await TestValidator.error(
    "updating with duplicate internal_sender_id throws error",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.update(connection, {
        id: admin2.id,
        body: {
          internal_sender_id: admin1.internal_sender_id,
        } satisfies IChatbotAdmin.IUpdate,
      });
    },
  );

  // 6. Attempt update without authorization
  await TestValidator.error(
    "unauthorized update attempt throws error",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.update(
        unauthConnection,
        {
          id: admin2.id,
          body: {
            nickname: RandomGenerator.name(),
          } satisfies IChatbotAdmin.IUpdate,
        },
      );
    },
  );

  // 7. Attempt update with invalid ID should fail
  await TestValidator.error(
    "updating with invalid admin ID throws error",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.update(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          nickname: RandomGenerator.name(),
        } satisfies IChatbotAdmin.IUpdate,
      });
    },
  );
}
