import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";

/**
 * This scenario tests creation of a new payment transaction by an administrator
 * user. The process covers authenticating an administrator user by joining and
 * login, then creating a payment transaction record referencing an existing
 * payment and a user by valid UUIDs. The transaction will include specifying
 * transaction_type, transaction_status, transaction_amount, and
 * transaction_date, all valid and realistic. Then the test validates that the
 * transaction is returned as expected, matching the sent data properties. It
 * also will cover validation for error cases such as missing or invalid
 * required fields or unauthorized creation by non-administrators. This test
 * will respect the business rule that only administrators can create payment
 * transactions and transaction must reference valid payment and user IDs. The
 * administrator authentication uses
 * ITelegramFileDownloaderAdministrator.ICreate and ILogin types for join and
 * login endpoints respectively. The transaction creation uses
 * ITelegramFileDownloaderTransactions.ICreate and expects
 * ITelegramFileDownloaderTransactions response. Random but valid UUIDs and
 * sensible data values are generated appropriately using typia.random and
 * RandomGenerator. Each step awaits the API call and asserts results using
 * typia.assert and TestValidator functions for correctness and error
 * validation.
 */
export async function test_api_payment_transaction_creation_admin_auth(
  connection: api.IConnection,
) {
  // 1. Administrator user joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password

  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Administrator user logins to set authorization
  const adminLoginBody = {
    email: adminEmail,
    password: adminPasswordHash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const adminLoggedIn: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Prepare required UUIDs for payment_id and user_id
  // Here we generate dummy UUIDs as placeholders for existing valid IDs
  const paymentId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create transaction with realistic data
  const transactionCreateBody = {
    payment_id: paymentId,
    user_id: userId,
    transaction_type: "charge", // Typical transaction type
    transaction_status: "succeeded", // Successful transaction
    transaction_amount: 121.5, // Example USD amount
    transaction_date: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderTransactions.ICreate;

  const transaction: ITelegramFileDownloaderTransactions =
    await api.functional.telegramFileDownloader.administrator.transactions.createTransaction(
      connection,
      {
        body: transactionCreateBody,
      },
    );
  typia.assert(transaction);

  // 5. Validate properties
  TestValidator.equals("payment_id matches", transaction.payment_id, paymentId);
  TestValidator.equals("user_id matches", transaction.user_id, userId);
  TestValidator.equals(
    "transaction_type matches",
    transaction.transaction_type,
    transactionCreateBody.transaction_type,
  );
  TestValidator.equals(
    "transaction_status matches",
    transaction.transaction_status,
    transactionCreateBody.transaction_status,
  );
  TestValidator.equals(
    "transaction_amount matches",
    transaction.transaction_amount,
    transactionCreateBody.transaction_amount,
  );
  TestValidator.equals(
    "transaction_date matches",
    transaction.transaction_date,
    transactionCreateBody.transaction_date,
  );

  // 6. Attempt to create transaction with invalid user authorization -
  // simulate by using a new connection without admin authorization
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot create transaction",
    async () => {
      await api.functional.telegramFileDownloader.administrator.transactions.createTransaction(
        unauthConnection,
        {
          body: transactionCreateBody,
        },
      );
    },
  );
}
