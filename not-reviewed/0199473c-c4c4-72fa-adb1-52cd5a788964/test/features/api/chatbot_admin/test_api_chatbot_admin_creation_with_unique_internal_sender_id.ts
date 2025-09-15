import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

/**
 * Test the creation of chatbot admin users with unique internal_sender_id
 * enforcement.
 *
 * This test covers the complete workflow of creating an initial admin via
 * admin join to authenticate, then using the chatbotAdmins creation
 * endpoint to create another admin user. It verifies uniqueness enforcement
 * on internal_sender_id by attempting duplicate creation and checks that
 * unauthorized attempts are rejected.
 *
 * Workflow:
 *
 * 1. Create and authenticate an initial chatbot admin user using
 *    /auth/admin/join.
 * 2. Create a new chatbot admin with a unique internal_sender_id and nickname.
 * 3. Validate that the created admin data matches expectations and includes
 *    timestamps.
 * 4. Attempt to create another admin with the same internal_sender_id, expect
 *    error.
 * 5. Attempt unauthorized creation (without authentication), expect error.
 */
export async function test_api_chatbot_admin_creation_with_unique_internal_sender_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate initial admin user
  const initialInternalSenderId = `initial_${RandomGenerator.alphaNumeric(10)}`;
  const initialNickname = RandomGenerator.name();
  const initialAdminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        internal_sender_id: initialInternalSenderId,
        nickname: initialNickname,
      } satisfies IChatbotAdmin.ICreate,
    });
  typia.assert(initialAdminAuthorized);

  // 2. Create a new admin with a unique internal_sender_id
  const newInternalSenderId = `unique_${RandomGenerator.alphaNumeric(10)}`;
  const newNickname = RandomGenerator.name();
  const createdAdmin: IChatbotAdmin =
    await api.functional.chatbot.admin.chatbotAdmins.create(connection, {
      body: {
        internal_sender_id: newInternalSenderId,
        nickname: newNickname,
      } satisfies IChatbotAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Validate created admin properties
  TestValidator.equals(
    "internal_sender_id matches new creation",
    createdAdmin.internal_sender_id,
    newInternalSenderId,
  );
  TestValidator.equals(
    "nickname matches new creation",
    createdAdmin.nickname,
    newNickname,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof createdAdmin.created_at === "string" &&
      createdAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof createdAdmin.updated_at === "string" &&
      createdAdmin.updated_at.length > 0,
  );
  TestValidator.predicate(
    "id is valid UUID format",
    typeof createdAdmin.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        createdAdmin.id,
      ),
  );

  // 3. Attempt to create admin with duplicate internal_sender_id - expect error
  await TestValidator.error(
    "duplicate internal_sender_id should cause creation failure",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.create(connection, {
        body: {
          internal_sender_id: newInternalSenderId,
          nickname: RandomGenerator.name(),
        } satisfies IChatbotAdmin.ICreate,
      });
    },
  );

  // 4. Attempt unauthorized creation (simulate a fresh unauthenticated connection)
  // Prepare unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const unauthorizedInternalSenderId = `unauth_${RandomGenerator.alphaNumeric(10)}`;
  const unauthorizedNickname = RandomGenerator.name();
  await TestValidator.error(
    "unauthorized creation attempt should be rejected",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.create(
        unauthenticatedConnection,
        {
          body: {
            internal_sender_id: unauthorizedInternalSenderId,
            nickname: unauthorizedNickname,
          } satisfies IChatbotAdmin.ICreate,
        },
      );
    },
  );
}
