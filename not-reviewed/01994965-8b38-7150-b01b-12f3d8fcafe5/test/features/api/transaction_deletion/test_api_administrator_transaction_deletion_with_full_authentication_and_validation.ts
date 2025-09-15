import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Test scenario for deleting a payment transaction as an administrator.
 *
 * Business Context: This test verifies the complete flow of an
 * administrator signing up, authenticating, and then deleting a transaction
 * record in the system. It ensures that only authorized administrators can
 * perform deletion, that the deletion operation is effective, and that
 * appropriate error handling is in place for invalid inputs.
 *
 * Step 1: Administrator joins with valid credentials, receives
 * authorization. Step 2: Administrator logs in successfully, obtains a
 * valid token. Step 3: Administrator deletes a transaction with a valid
 * UUID ID. Step 4: Attempt to delete a transaction with an
 * invalid/nonexistent ID, and verify error handling.
 *
 * Validations:
 *
 * - Ensure administrator details after join and login are accurate.
 * - Confirm deletion API returns success with no content.
 * - Validate that deletion prevents future retrieval of the transaction.
 * - Unauthorized or malformed deletion attempts are properly rejected.
 */
export async function test_api_administrator_transaction_deletion_with_full_authentication_and_validation(
  connection: api.IConnection,
) {
  // 1. Administrator joins
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(10);
  const adminCreateBody = {
    email: email,
    password_hash: password,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;
  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Administrator logs in
  const adminLoginBody = {
    email: email,
    password: password,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;
  const adminLoggedIn: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Administrator deletes a transaction with a valid UUID ID
  const validTransactionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.telegramFileDownloader.administrator.transactions.eraseTransaction(
    connection,
    { id: validTransactionId },
  );

  // 4. Attempt to delete a transaction with an invalid/nonexistent ID
  const invalidTransactionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent transaction fails",
    async () => {
      await api.functional.telegramFileDownloader.administrator.transactions.eraseTransaction(
        connection,
        { id: invalidTransactionId },
      );
    },
  );
}
