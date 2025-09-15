import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderStripeWebhookLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderStripeWebhookLogs";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderStripeWebhookLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStripeWebhookLogs";

/**
 * Test the retrieval of a filtered and paginated list of Stripe webhook
 * logs with administrator authentication.
 *
 * This test performs the following steps:
 *
 * 1. Creates and authenticates a new administrator user via the join API.
 * 2. Queries the Stripe webhook logs using the authenticated administrator
 *    context.
 * 3. Provides pagination, filtering parameters with correct types and formats.
 * 4. Validates the response's pagination properties and verifies the returned
 *    log entries.
 * 5. Tests boundary conditions such as empty results by using filters, and
 *    unauthorized access scenarios.
 */
export async function test_api_stripe_webhook_log_list_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and authentication
  const adminCreate = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Step 2: Query Stripe webhook logs with valid pagination and filtering
  // Query 1: Basic pagination only
  const filter1: ITelegramFileDownloaderStripeWebhookLogs.IRequest = {
    page: 1,
    limit: 10,
    event_type: null,
    processed: null,
  };

  const response1: IPageITelegramFileDownloaderStripeWebhookLogs.ISummary =
    await api.functional.telegramFileDownloader.administrator.stripeWebhookLogs.index(
      connection,
      { body: filter1 },
    );
  typia.assert(response1);

  // Validate pagination values
  TestValidator.predicate(
    "pagination current page is positive",
    response1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response1.pagination.records >= 0,
  );

  // Validate all data entries
  for (const entry of response1.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "entry.event_id is non-empty string",
      typeof entry.event_id === "string" && entry.event_id.length > 0,
    );
    TestValidator.predicate(
      "entry.event_type is non-empty string",
      typeof entry.event_type === "string" && entry.event_type.length > 0,
    );
    TestValidator.predicate(
      "entry.processed is boolean",
      typeof entry.processed === "boolean",
    );
  }

  // Step 3: Query with filters targeting no matches (empty result set)
  const filter2: ITelegramFileDownloaderStripeWebhookLogs.IRequest = {
    page: 1,
    limit: 5,
    event_type: "non-existent-event-type-example",
    processed: true,
  };

  const response2: IPageITelegramFileDownloaderStripeWebhookLogs.ISummary =
    await api.functional.telegramFileDownloader.administrator.stripeWebhookLogs.index(
      connection,
      { body: filter2 },
    );
  typia.assert(response2);

  TestValidator.equals(
    "empty result set with no matching filters",
    response2.data.length,
    0,
  );

  // Step 4: Test unauthorized access
  // Create an unauthenticated connection with empty headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to Stripe webhook logs should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.stripeWebhookLogs.index(
        unauthenticated,
        { body: filter1 },
      );
    },
  );
}
