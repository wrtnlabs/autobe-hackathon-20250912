import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";

/**
 * Test to ensure that authorized admin users can delete chatbot room tuples
 * successfully.
 *
 * This test covers the full lifecycle:
 *
 * 1. Admin user creation and authentication.
 * 2. Creating a chatbot room tuple.
 * 3. Deleting the created tuple by UUID.
 * 4. Attempting to delete the same tuple again to confirm error handling on
 *    non-existence.
 *
 * All API responses are asserted for type correctness. Authorization headers
 * are managed implicitly by the SDK. This confirms the business rule
 * enforcement and correct error management.
 */
export async function test_api_chatbot_room_tuple_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Admin join and authenticate
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuthorized);

  // Step 2: Create a chatbot room tuple to be deleted
  const tupleCreateBody = {
    normal_room_id: RandomGenerator.alphaNumeric(8),
    admin_room_id: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(2),
    unique_id: RandomGenerator.alphaNumeric(10),
    enabled: true,
  } satisfies IChatbotRoomTuples.ICreate;

  const createdTuple =
    await api.functional.chatbot.admin.chatbotRoomTuples.create(connection, {
      body: tupleCreateBody,
    });
  typia.assert(createdTuple);

  // Step 3: Delete the chatbot room tuple by UUID
  await api.functional.chatbot.admin.chatbotRoomTuples.erase(connection, {
    id: createdTuple.id,
  });

  // Step 4: Attempt to delete the same tuple again and expect error
  await TestValidator.error(
    "deleting non-existent tuple throws error",
    async () => {
      await api.functional.chatbot.admin.chatbotRoomTuples.erase(connection, {
        id: createdTuple.id,
      });
    },
  );
}
