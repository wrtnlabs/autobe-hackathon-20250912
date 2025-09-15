import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockPriceUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceUpdate";

/**
 * Validates admin-only detail access of stock price update events.
 *
 * This test covers:
 *
 * - Admin user creation and authentication
 * - Authorized access to stock price update event detail
 * - Data structure and format validation
 * - Error handling for non-existent IDs
 * - Unauthorized access rejection
 *
 * Test steps:
 *
 * 1. Create and join an admin user with unique internal_sender_id and nickname
 * 2. Fetch details of a stock price update by a generated UUID
 * 3. Assert all required properties and their types
 * 4. Verify error on invalid ID
 * 5. Verify unauthorized access fails
 */
export async function test_api_stock_price_update_detail_access_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create and join admin user
  const internalSenderId = RandomGenerator.alphaNumeric(10);
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

  // 2. Use authenticated connection to fetch stock price update details
  //    Using an existing UUID or generating a random UUID
  const validUpdateId = typia.random<string & tags.Format<"uuid">>();

  const updateDetail: IChatbotStockPriceUpdate =
    await api.functional.chatbot.admin.stockPriceUpdates.at(connection, {
      stockPriceUpdateId: validUpdateId,
    });
  typia.assert(updateDetail);

  // 3. Validate properties according to schema
  TestValidator.predicate(
    "id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updateDetail.id,
    ),
  );

  if (
    updateDetail.updated_by_admin_id !== undefined &&
    updateDetail.updated_by_admin_id !== null
  ) {
    TestValidator.predicate(
      "updated_by_admin_id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        updateDetail.updated_by_admin_id,
      ),
    );
  } else {
    TestValidator.equals(
      "updated_by_admin_id is null or undefined",
      updateDetail.updated_by_admin_id,
      updateDetail.updated_by_admin_id,
    );
  }

  TestValidator.predicate(
    "update_date is ISO 8601",
    typeof updateDetail.update_date === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        updateDetail.update_date,
      ),
  );

  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof updateDetail.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        updateDetail.created_at,
      ),
  );

  // notes can be null or string
  if (updateDetail.notes !== undefined && updateDetail.notes !== null) {
    TestValidator.predicate(
      "notes is string",
      typeof updateDetail.notes === "string",
    );
  } else {
    TestValidator.equals(
      "notes is null or undefined",
      updateDetail.notes,
      updateDetail.notes,
    );
  }

  // 4. Test error handling with an invalid ID
  const invalidId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error("fetch with invalid ID should fail", async () => {
    await api.functional.chatbot.admin.stockPriceUpdates.at(connection, {
      stockPriceUpdateId: invalidId,
    });
  });

  // 5. Test unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized fetch should fail", async () => {
    await api.functional.chatbot.admin.stockPriceUpdates.at(unauthConn, {
      stockPriceUpdateId: validUpdateId,
    });
  });
}
