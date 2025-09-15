import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderStripeWebhookLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStripeWebhookLogs";

/**
 * This test validates the detailed retrieval of a Stripe webhook log via the
 * administrator API endpoint
 * /telegramFileDownloader/administrator/stripeWebhookLogs/{stripeWebhookLogId}.
 *
 * The scenario covers the authentication of an administrator to obtain an
 * access token, creation or simulation of a Stripe webhook log to be queried,
 * then retrieves the Stripe webhook log detail using its unique UUID
 * identifier. The test verifies that the response structure matches the
 * specified ITelegramFileDownloaderStripeWebhookLogs definition by asserting
 * types with typia.assert().
 *
 * It also validates failure cases such as retrieving logs with nonexistent
 * UUIDs and unauthorized access attempts by unauthenticated clients. The test
 * enforces the proper use of administrator authentication and API access
 * control.
 *
 * Test steps:
 *
 * 1. Administrator sign-up creates an admin user and obtains JWT authorization
 *    token.
 * 2. A realistic UUID is generated as Stripe webhook log ID.
 * 3. Retrieve Stripe webhook log detail using the admin-authenticated connection.
 * 4. Assert that the response matches expected structure and ID.
 * 5. Verify error when querying with a non-existent log ID.
 * 6. Verify error when querying without any authentication.
 *
 * This reflects a real-world admin querying logs with authorization and robust
 * validation.
 */
export async function test_api_stripe_webhook_log_detail_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator signs up and obtains authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Use simulated Stripe webhook log ID for retrieval
  const stripeWebhookLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve Stripe webhook log detail
  const log: ITelegramFileDownloaderStripeWebhookLogs =
    await api.functional.telegramFileDownloader.administrator.stripeWebhookLogs.at(
      connection,
      {
        stripeWebhookLogId,
      },
    );
  typia.assert(log);
  TestValidator.equals(
    "stripe webhook log ID matches",
    log.id,
    stripeWebhookLogId,
  );

  // 4. Test failure for non-existent UUID
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on non-existent stripe webhook log ID",
    async () => {
      await api.functional.telegramFileDownloader.administrator.stripeWebhookLogs.at(
        connection,
        { stripeWebhookLogId: nonExistentUUID },
      );
    },
  );

  // 5. Test unauthorized access without admin auth
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access without authentication",
    async () => {
      await api.functional.telegramFileDownloader.administrator.stripeWebhookLogs.at(
        unauthenticatedConnection,
        { stripeWebhookLogId },
      );
    },
  );
}
