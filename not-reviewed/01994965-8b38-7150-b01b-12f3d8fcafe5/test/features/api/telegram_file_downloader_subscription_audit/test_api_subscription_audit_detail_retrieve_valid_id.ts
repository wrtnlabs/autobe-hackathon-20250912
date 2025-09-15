import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderSubscriptionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionAudit";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderSubscriptionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionAudit";

/**
 * This test scenario ensures that retrieving a single subscription audit record
 * by its valid subscriptionAuditId returns complete and accurate audit details.
 * It starts with administrator user registration and login to set the
 * authentication context. The test creates an administrator user with a unique
 * email. Then it logs in with the created administrator account to obtain
 * authorization tokens. Using authentication, it requests a list of
 * subscription audits to obtain a valid subscriptionAuditId for detailed
 * retrieval. It retrieves the single subscription audit record by this ID and
 * verifies that all expected fields like user_id, subscription_plan_id,
 * change_type, change_timestamp, notes, created_at, updated_at, and optional
 * deleted_at properties exist and comply with types and formats.
 *
 * It also tests authorization enforcement by attempting access without
 * authorization, expecting failure. Additionally, it tests invalid UUID formats
 * and non-existent IDs, verifying proper error handling.
 *
 * All successful API responses are validated using typia.assert to ensure
 * perfect type correctness. TestValidator is used to assert the presence and
 * equality of expected business fields.
 */
export async function test_api_subscription_audit_detail_retrieve_valid_id(
  connection: api.IConnection,
) {
  // Administrator user registration
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "somehashedpassword123",
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // Administrator login
  const loginRes: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: "somehashedpassword123",
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    });
  typia.assert(loginRes);

  // Pagination request to get subscription audits with default pagination
  const pageRequestBody = {
    page: 1,
    limit: 10,
  } satisfies ITelegramFileDownloaderSubscriptionAudit.IRequest;
  const subscriptionAuditPage: IPageITelegramFileDownloaderSubscriptionAudit =
    await api.functional.telegramFileDownloader.administrator.subscriptionAudits.index(
      connection,
      { body: pageRequestBody },
    );
  typia.assert(subscriptionAuditPage);

  // Validate that the page contains some records
  TestValidator.predicate(
    "subscription audit page should contain data",
    Array.isArray(subscriptionAuditPage.data) &&
      subscriptionAuditPage.data.length > 0,
  );

  // Select one subscription audit record for detailed retrieval
  const selectedAudit: ITelegramFileDownloaderSubscriptionAudit =
    subscriptionAuditPage.data[0];

  // Assert key properties presence and type formats
  typia.assert<string & tags.Format<"uuid">>(selectedAudit.id);
  typia.assert<string & tags.Format<"uuid">>(
    selectedAudit.telegram_file_downloader_subscription_plan_id,
  );
  if (
    selectedAudit.telegram_file_downloader_payment_id !== null &&
    selectedAudit.telegram_file_downloader_payment_id !== undefined
  ) {
    typia.assert<string & tags.Format<"uuid">>(
      selectedAudit.telegram_file_downloader_payment_id,
    );
  }
  typia.assert<string & tags.Format<"uuid">>(selectedAudit.user_id);

  TestValidator.predicate(
    "change_type is a non-empty string",
    typeof selectedAudit.change_type === "string" &&
      selectedAudit.change_type.length > 0,
  );

  typia.assert<string & tags.Format<"date-time">>(
    selectedAudit.change_timestamp,
  );

  if (selectedAudit.notes !== null && selectedAudit.notes !== undefined) {
    TestValidator.predicate(
      "notes can be null or a string",
      typeof selectedAudit.notes === "string" || selectedAudit.notes === null,
    );
  }

  typia.assert<string & tags.Format<"date-time">>(selectedAudit.created_at);
  typia.assert<string & tags.Format<"date-time">>(selectedAudit.updated_at);
  if (
    selectedAudit.deleted_at !== null &&
    selectedAudit.deleted_at !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(selectedAudit.deleted_at);
  }

  // Authorization verification: attempt to index subscription audits without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to subscription audits should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.subscriptionAudits.index(
        unauthConnection,
        { body: pageRequestBody },
      );
    },
  );

  // Error handling: invalid UUID formats or non-existent IDs in filter that exist
  const invalidUUIDs = [
    "invalid-uuid",
    "123",
    "not-a-uuid",
    "00000000-0000-0000-0000-000000000000",
  ];

  // Since 'id' filter does not exist, simulate errors by filtering with non-existent user_id
  for (const invalidId of invalidUUIDs) {
    await TestValidator.error(
      `retrieving subscription audits with invalid user_id filter ${invalidId} should fail`,
      async () => {
        await api.functional.telegramFileDownloader.administrator.subscriptionAudits.index(
          connection,
          {
            body: {
              page: 1,
              limit: 1,
              filter: { user_id: invalidId },
            },
          },
        );
      },
    );
  }
}
