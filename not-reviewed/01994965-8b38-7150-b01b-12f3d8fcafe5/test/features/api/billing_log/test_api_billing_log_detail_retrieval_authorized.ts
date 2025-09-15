import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderBillingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderBillingLog";

/**
 * Validates the authorized detailed retrieval of a billing log for a
 * Telegram File Downloader administrator.
 *
 * This test ensures that an administrator can register, login, and
 * successfully retrieve a detailed billing log entry by its ID. It also
 * tests failure cases for unauthorized access and non-existent billing
 * logs.
 *
 * Test steps:
 *
 * 1. Create a new administrator user with email and password hash.
 * 2. Authenticate the administrator user to obtain a JWT token.
 * 3. Use the authenticated connection to fetch a valid billing log entry by
 *    ID.
 * 4. Verify all fields in the returned billing log comply with formats and
 *    expected types.
 * 5. Attempt to fetch a non-existent billing log and assert that an HTTP 404
 *    error is thrown.
 * 6. Attempt to fetch a billing log without authentication and assert an
 *    authorization error occurs.
 */
export async function test_api_billing_log_detail_retrieval_authorized(
  connection: api.IConnection,
) {
  // 1. Administrator account creation
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const createdAdmin = await api.functional.auth.administrator.join(
    connection,
    { body: createBody },
  );
  typia.assert(createdAdmin);

  // 2. Administrator login
  const loginBody = {
    email: createBody.email,
    password: createBody.password_hash, // password used for login matches password_hash from creation
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loggedInAdmin = await api.functional.auth.administrator.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInAdmin);

  // 3. Retrieve a billing log entry
  // Use a random UUID as billingLogId
  const billingLogId = typia.random<string & tags.Format<"uuid">>();

  // The SDK manages Authorization headers internally after join/login
  // Fetch the billing log by ID
  const billingLog =
    await api.functional.telegramFileDownloader.administrator.billingLogs.at(
      connection,
      { billingLogId },
    );
  typia.assert(billingLog);

  // 4. Verify each property matches expected format and types
  TestValidator.predicate(
    "billingLog.id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      billingLog.id,
    ),
  );
  TestValidator.predicate(
    "billingLog.telegram_file_downloader_payment_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      billingLog.telegram_file_downloader_payment_id,
    ),
  );
  TestValidator.predicate(
    "billingLog.event_type is string",
    typeof billingLog.event_type === "string",
  );
  TestValidator.predicate(
    "billingLog.event_timestamp is date-time",
    !isNaN(Date.parse(billingLog.event_timestamp)),
  );
  TestValidator.predicate(
    "billingLog.details is string or null or undefined",
    billingLog.details === null ||
      billingLog.details === undefined ||
      typeof billingLog.details === "string",
  );
  TestValidator.predicate(
    "billingLog.created_at is date-time",
    !isNaN(Date.parse(billingLog.created_at)),
  );
  TestValidator.predicate(
    "billingLog.updated_at is date-time",
    !isNaN(Date.parse(billingLog.updated_at)),
  );
  TestValidator.predicate(
    "billingLog.deleted_at is null or undefined or date-time",
    billingLog.deleted_at === null ||
      billingLog.deleted_at === undefined ||
      !isNaN(Date.parse(billingLog.deleted_at)),
  );

  // 5. Test retrieval of non-existent billing log should throw HTTP 404 error
  await TestValidator.error(
    "fetch non-existing billing log throws HTTP 404",
    async () => {
      await api.functional.telegramFileDownloader.administrator.billingLogs.at(
        connection,
        {
          billingLogId:
            "00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid">,
        },
      );
    },
  );

  // 6. Test retrieval without authentication throws authorization error
  // Create a fresh unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access throws authorization error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.billingLogs.at(
        unauthenticatedConnection,
        { billingLogId },
      );
    },
  );
}
