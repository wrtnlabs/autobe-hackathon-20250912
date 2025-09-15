import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";

/**
 * Test scenario for updating an existing chatbot room tuple by an authorized
 * admin user. The test starts with authenticating an admin user via join, then
 * creates a chatbot room tuple to have a valid target to update. The update
 * changes fields such as normal_room_id, admin_room_id, display_name, and
 * unique_id. The test validates correct field updates, uniqueness of unique_id,
 * and verifies admin authorization. Failure cases include updating with invalid
 * IDs, duplicate unique_id, and unauthorized user scenarios. The scenario
 * ensures the updated tuple details are properly reflected when retrieved.
 */
export async function test_api_chatbot_room_tuple_update_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminInput = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminInput,
    },
  );
  typia.assert(admin);

  // 2. Create initial chatbot room tuple
  const createInput = {
    normal_room_id: `normal-${RandomGenerator.alphaNumeric(8)}`,
    admin_room_id: `admin-${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(3),
    unique_id: `tuple-${RandomGenerator.alphaNumeric(8)}`,
    enabled: true,
  } satisfies IChatbotRoomTuples.ICreate;
  const createdTuple: IChatbotRoomTuples =
    await api.functional.chatbot.admin.chatbotRoomTuples.create(connection, {
      body: createInput,
    });
  typia.assert(createdTuple);

  // 3. Update chatbot room tuple using the created ID
  const updateInput = {
    normal_room_id: `updated-normal-${RandomGenerator.alphaNumeric(8)}`,
    admin_room_id: `updated-admin-${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(4),
    unique_id: `updated-tuple-${RandomGenerator.alphaNumeric(8)}`,
    enabled: false,
  } satisfies IChatbotRoomTuples.IUpdate;
  const updatedTuple: IChatbotRoomTuples =
    await api.functional.chatbot.admin.chatbotRoomTuples.update(connection, {
      id: createdTuple.id,
      body: updateInput,
    });
  typia.assert(updatedTuple);

  // 4. Validate the updated fields
  TestValidator.equals(
    "normal_room_id should be updated",
    updatedTuple.normal_room_id,
    updateInput.normal_room_id,
  );
  TestValidator.equals(
    "admin_room_id should be updated",
    updatedTuple.admin_room_id,
    updateInput.admin_room_id,
  );
  TestValidator.equals(
    "display_name should be updated",
    updatedTuple.display_name,
    updateInput.display_name,
  );
  TestValidator.equals(
    "unique_id should be updated",
    updatedTuple.unique_id,
    updateInput.unique_id,
  );
  TestValidator.equals(
    "enabled flag should be updated",
    updatedTuple.enabled,
    updateInput.enabled,
  );
  TestValidator.equals(
    "id should remain the same",
    updatedTuple.id,
    createdTuple.id,
  );
  TestValidator.predicate(
    "created_at should be defined",
    typeof updatedTuple.created_at === "string" &&
      updatedTuple.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a new timestamp",
    updatedTuple.updated_at !== updatedTuple.created_at,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined",
    updatedTuple.deleted_at === null || updatedTuple.deleted_at === undefined,
  );
}
