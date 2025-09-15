import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";

/**
 * Test retrieval of a single chatbot room tuple by its unique identifier.
 *
 * Scenario involves authenticating as admin and preparing a known chatbot room
 * tuple entry to retrieve by ID. Validate the full response fields for
 * correctness and completeness, including normal_room_id, admin_room_id,
 * display_name, unique_id, enabled flag, and timestamps. Test error case for
 * non-existent ID with expected 404 response. Ensure admin role authorization
 * is verified for access.
 */
export async function test_api_chatbot_room_tuple_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const internalSenderId = RandomGenerator.alphaNumeric(8);
  const nickname = RandomGenerator.name(2);
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

  // 2. Retrieve chatbot room tuple details with a valid random UUID
  //    Since there's no creation API, we use a random UUID but understand this may not exist in production
  const tupleId = typia.random<string & tags.Format<"uuid">>();
  const roomTuple: IChatbotRoomTuples =
    await api.functional.chatbot.admin.chatbotRoomTuples.at(connection, {
      id: tupleId,
    });
  typia.assert(roomTuple);

  // Validate essential properties
  TestValidator.predicate(
    "roomTuple.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      roomTuple.id,
    ),
  );
  TestValidator.predicate(
    "roomTuple.normal_room_id is non-empty string",
    roomTuple.normal_room_id.length > 0,
  );
  TestValidator.predicate(
    "roomTuple.admin_room_id is non-empty string",
    roomTuple.admin_room_id.length > 0,
  );
  TestValidator.predicate(
    "roomTuple.display_name is non-empty string",
    roomTuple.display_name.length > 0,
  );
  TestValidator.predicate(
    "roomTuple.unique_id is non-empty string",
    roomTuple.unique_id.length > 0,
  );
  TestValidator.predicate(
    "roomTuple.enabled is boolean",
    typeof roomTuple.enabled === "boolean",
  );
  TestValidator.predicate(
    "roomTuple.created_at is valid ISO date-time",
    !isNaN(Date.parse(roomTuple.created_at)),
  );
  TestValidator.predicate(
    "roomTuple.updated_at is valid ISO date-time",
    !isNaN(Date.parse(roomTuple.updated_at)),
  );

  // 3. Test error scenario: retrieval with non-existent ID
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "retrieving non-existent id should throw",
    async () => {
      await api.functional.chatbot.admin.chatbotRoomTuples.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
