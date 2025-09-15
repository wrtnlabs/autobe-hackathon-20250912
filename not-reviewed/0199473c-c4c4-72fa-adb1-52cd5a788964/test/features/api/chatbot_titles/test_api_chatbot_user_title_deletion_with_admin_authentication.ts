import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";

/**
 * Validate the deletion of a user title by authorized admin authentication.
 *
 * This test workflow consists of:
 *
 * 1. Admin user joining to create and authenticate.
 * 2. Creating a chatbot user title with valid properties.
 * 3. Deleting the created user title.
 * 4. Attempting to delete the same title again and verifying an error is thrown.
 * 5. Verifying that an unauthorized user cannot delete the title.
 *
 * This covers positive deletion flows and negative error checks for
 * authorization and existence.
 */
export async function test_api_chatbot_user_title_deletion_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user joins to create account and obtain authorization
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(admin);

  // 2. Create a user title with required fields
  const titleCreateBody = {
    name: RandomGenerator.name(2),
    fee_discount_rate: Math.floor(Math.random() * 101), // 0 to 100 inclusive
  } satisfies IChatbotTitles.ICreate;

  const title: IChatbotTitles =
    await api.functional.chatbot.admin.titles.create(connection, {
      body: titleCreateBody,
    });
  typia.assert(title);

  // 3. Delete the created user title by id
  await api.functional.chatbot.admin.titles.erase(connection, { id: title.id });

  // 4. Validate deletion by attempting to delete again - should error
  await TestValidator.error(
    "deleting already deleted title should fail",
    async () => {
      await api.functional.chatbot.admin.titles.erase(connection, {
        id: title.id,
      });
    },
  );

  // 5. Validate unauthorized deletion attempt is rejected
  // Create a new connection without admin join for unauthorized user
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized user cannot delete title",
    async () => {
      await api.functional.chatbot.admin.titles.erase(unauthorizedConnection, {
        id: title.id,
      });
    },
  );
}
