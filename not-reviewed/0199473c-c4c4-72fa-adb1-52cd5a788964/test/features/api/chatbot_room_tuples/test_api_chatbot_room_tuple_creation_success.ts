import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";

/**
 * This test validates that an authorized admin user can successfully create a
 * chatbot room tuple. The test covers the full flow of admin joining via the
 * authentication endpoint, followed by creating a new chatbot room tuple with
 * unique identifiers and room IDs. It ensures all required properties are
 * returned correctly and that timestamps are valid ISO date-time strings. This
 * confirms the proper functionality, business rules adherence, and type safety
 * of the relevant API endpoints.
 */
export async function test_api_chatbot_room_tuple_creation_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const internalSenderId = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name();
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        internal_sender_id: internalSenderId,
        nickname: nickname,
      } satisfies IChatbotAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create chatbot room tuple
  const uniqueId = RandomGenerator.alphaNumeric(12);
  const normalRoomId = typia.random<string & tags.Format<"uuid">>();
  const adminRoomId = typia.random<string & tags.Format<"uuid">>();
  const displayName = RandomGenerator.name();
  const enabled = true;

  const tupleCreate: IChatbotRoomTuples.ICreate = {
    unique_id: uniqueId,
    normal_room_id: normalRoomId,
    admin_room_id: adminRoomId,
    display_name: displayName,
    enabled: enabled,
  };

  const tuple: IChatbotRoomTuples =
    await api.functional.chatbot.admin.chatbotRoomTuples.create(connection, {
      body: tupleCreate,
    });
  typia.assert(tuple);

  // 3. Validate response data
  TestValidator.equals(
    "unique_id matches in response",
    tuple.unique_id,
    uniqueId,
  );
  TestValidator.equals(
    "normal_room_id matches in response",
    tuple.normal_room_id,
    normalRoomId,
  );
  TestValidator.equals(
    "admin_room_id matches in response",
    tuple.admin_room_id,
    adminRoomId,
  );
  TestValidator.equals(
    "display_name matches in response",
    tuple.display_name,
    displayName,
  );
  TestValidator.equals("enabled flag true", tuple.enabled, true);
  TestValidator.predicate(
    "created_at is a valid ISO date time",
    typeof tuple.created_at === "string" &&
      !isNaN(Date.parse(tuple.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date time",
    typeof tuple.updated_at === "string" &&
      !isNaN(Date.parse(tuple.updated_at)),
  );
}
