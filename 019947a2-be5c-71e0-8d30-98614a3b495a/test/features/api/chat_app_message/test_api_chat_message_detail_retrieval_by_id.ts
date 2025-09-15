import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Validate retrieval of a single chat message detail by its ID for an
 * authenticated regular user.
 *
 * The test flow includes:
 *
 * 1. Creating and authenticating a new regular user via the join endpoint.
 * 2. Creating a dummy chat message ID with realistic properties.
 * 3. Retrieving the message details via GET
 *    /chatApp/regularUser/messages/{id}.
 * 4. Validating the full message data including sender, recipient/group,
 *    content, timestamps, and message type.
 * 5. Checking access control correctness.
 * 6. Testing error handling for non-existent message IDs and unauthorized
 *    access.
 */
export async function test_api_chat_message_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const userCreateBody = {
    social_login_id: `user_${RandomGenerator.alphaNumeric(10)}`,
    nickname: RandomGenerator.name(2),
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    { body: userCreateBody },
  );
  typia.assert(authorizedUser);

  // 2. Prepare a dummy chat message detail to test retrieval
  // Note: Since no create message API is provided, generate a dummy ID
  // and assume it's accessible for authenticated user for test purpose
  const messageId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the message by ID
  // Expect the API to return full details

  const message = await api.functional.chatApp.regularUser.messages.at(
    connection,
    { id: messageId },
  );
  typia.assert(message);

  // 4. Validate the required fields
  TestValidator.predicate("message id should match", message.id === messageId);

  // Validate sender_id is a valid uuid string
  TestValidator.predicate(
    "sender_id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      message.sender_id,
    ),
  );

  // Validate message_type is one of the allowed values
  TestValidator.predicate(
    "message_type is valid",
    ["text", "image", "video"].includes(message.message_type),
  );

  // Validate content is string
  TestValidator.predicate(
    "content is string",
    typeof message.content === "string",
  );

  // Validate created_at, updated_at are valid ISO date-time strings
  for (const field of ["created_at", "updated_at"] as const) {
    TestValidator.predicate(
      `${field} format ISO8601`,
      !isNaN(Date.parse(message[field])),
    );
  }

  // Validate deleted_at is either null or undefined or ISO date-time string
  if (message.deleted_at !== null && message.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at format ISO8601",
      !isNaN(Date.parse(message.deleted_at)),
    );
  }

  // Validate group_id and recipient_id: allow null/undefined or valid UUID string
  if (message.group_id !== null && message.group_id !== undefined) {
    TestValidator.predicate(
      "group_id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        message.group_id,
      ),
    );
  }
  if (message.recipient_id !== null && message.recipient_id !== undefined) {
    TestValidator.predicate(
      "recipient_id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        message.recipient_id,
      ),
    );
  }

  // 5. Negative test: Attempt to fetch a non-existent message ID
  const invalidMessageId = typia.random<string & tags.Format<"uuid">>();
  if (invalidMessageId !== messageId) {
    await TestValidator.error(
      "fetching non-existent message should fail",
      async () =>
        await api.functional.chatApp.regularUser.messages.at(connection, {
          id: invalidMessageId,
        }),
    );
  }

  // 6. Negative test: Access with unauthorized connection should fail
  // Create unauthenticated connection (empty headers, no auth token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should fail",
    async () =>
      await api.functional.chatApp.regularUser.messages.at(unauthConnection, {
        id: messageId,
      }),
  );
}
