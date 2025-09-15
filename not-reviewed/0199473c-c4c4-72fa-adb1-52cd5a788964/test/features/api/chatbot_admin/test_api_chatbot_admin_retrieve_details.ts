import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

/**
 * Test the chatbot admin detail retrieval workflow.
 *
 * This includes end-to-end steps of admin creation (join), login
 * (authentication), and retrieving details by ID with proper error handling
 * for missing or invalid IDs.
 *
 * 1. Create a new admin user with unique internal_sender_id and nickname.
 * 2. Login as this admin user to obtain the access token.
 * 3. Retrieve admin details by valid ID and validate all properties.
 * 4. Try retrieving admin details with a non-existing UUID and validate 404
 *    error.
 */
export async function test_api_chatbot_admin_retrieve_details(
  connection: api.IConnection,
) {
  // 1. Create a new admin user via join API
  const internalSenderId = RandomGenerator.alphaNumeric(12);
  const nickname = RandomGenerator.name(2);
  const createBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotAdmin.ICreate;
  const createdAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "created admin internal_sender_id matches",
    createdAdmin.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "created admin nickname matches",
    createdAdmin.nickname,
    nickname,
  );

  // 2. Login as created admin user
  const loginBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotAdmin.ILogin;
  const loggedInAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged in admin id matches created",
    loggedInAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "logged in admin internal_sender_id matches",
    loggedInAdmin.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "logged in admin nickname matches",
    loggedInAdmin.nickname,
    nickname,
  );

  // 3. Retrieve admin details by valid ID
  const retrievedAdmin: IChatbotAdmin =
    await api.functional.chatbot.admin.chatbotAdmins.at(connection, {
      id: createdAdmin.id,
    });
  typia.assert(retrievedAdmin);

  TestValidator.equals(
    "retrieved admin id matches created",
    retrievedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin internal_sender_id matches",
    retrievedAdmin.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "retrieved admin nickname matches",
    retrievedAdmin.nickname,
    nickname,
  );
  TestValidator.equals(
    "retrieved admin created_at matches",
    retrievedAdmin.created_at,
    createdAdmin.created_at,
  );
  TestValidator.equals(
    "retrieved admin updated_at matches",
    retrievedAdmin.updated_at,
    createdAdmin.updated_at,
  );
  TestValidator.equals(
    "retrieved admin deleted_at matches",
    retrievedAdmin.deleted_at ?? null,
    createdAdmin.deleted_at ?? null,
  );

  // 4. Attempt retrieval with non-existing UUID
  await TestValidator.error(
    "retrieving non-existing admin id should throw 404",
    async () => {
      await api.functional.chatbot.admin.chatbotAdmins.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
