import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";

/**
 * This E2E test validates updating an existing payment transaction by an
 * administrator.
 *
 * The test performs the following steps:
 *
 * 1. Administrator user account is created and authenticated via join and
 *    login apis.
 * 2. A payment transaction is simulated or created with valid initial data.
 * 3. The test updates the payment transaction using a PUT request with updated
 *    data.
 * 4. Validates the updated transaction's fields match expected updated values.
 * 5. Tests error scenarios for invalid transaction ID and unauthorized access.
 *
 * Business rules enforced include proper admin authentication, validation
 * of transaction update fields, and ensuring association validity for
 * payment and user IDs.
 *
 * The test uses strict typia.assert to validate response objects and uses
 * TestValidator for business logic validations. Random data generation
 * respects required data formats.
 */
export async function test_api_payment_transaction_update_admin_auth(
  connection: api.IConnection,
) {
  // 1. Administrator join - create an administrator account
  // Note: Using plain password string as password_hash for test simulation purposes
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "securePassword123";

  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword, // Simulate hashed password for test
      },
    });
  typia.assert(adminAuthorized);

  // 2. Administrator login to authenticate and obtain JWT token
  const adminLogin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    });
  typia.assert(adminLogin);

  // Utility function to generate a valid payment transaction update body
  function generateTransactionUpdateBody(): ITelegramFileDownloaderTransactions.IUpdate {
    return {
      payment_id: typia.random<string & tags.Format<"uuid">>(),
      user_id: typia.random<string & tags.Format<"uuid">>(),
      transaction_type: RandomGenerator.pick([
        "charge",
        "refund",
        "adjustment",
      ] as const),
      transaction_status: RandomGenerator.pick([
        "succeeded",
        "failed",
        "pending",
      ] as const),
      transaction_amount: Math.floor(Math.random() * 1000) + 1,
      transaction_date: new Date().toISOString(),
    };
  }

  // 3. Create initial transaction data to update (simulate random initial transaction)
  // Since no create API exists, we simulate an existing transaction ID
  const transactionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Update payment transaction with valid data
  const updateBody =
    generateTransactionUpdateBody() satisfies ITelegramFileDownloaderTransactions.IUpdate;

  const updatedTransaction: ITelegramFileDownloaderTransactions =
    await api.functional.telegramFileDownloader.administrator.transactions.updateTransaction(
      connection,
      {
        id: transactionId,
        body: updateBody,
      },
    );
  typia.assert(updatedTransaction);

  // 5. Validate the updated fields match the request values or remain unchanged as applicable
  TestValidator.equals(
    "updated payment_id matches",
    updatedTransaction.payment_id,
    updateBody.payment_id!,
  );
  TestValidator.equals(
    "updated user_id matches",
    updatedTransaction.user_id,
    updateBody.user_id!,
  );
  TestValidator.equals(
    "updated transaction_type matches",
    updatedTransaction.transaction_type,
    updateBody.transaction_type!,
  );
  TestValidator.equals(
    "updated transaction_status matches",
    updatedTransaction.transaction_status,
    updateBody.transaction_status!,
  );
  TestValidator.equals(
    "updated transaction_amount matches",
    updatedTransaction.transaction_amount,
    updateBody.transaction_amount!,
  );
  TestValidator.equals(
    "updated transaction_date matches",
    updatedTransaction.transaction_date,
    updateBody.transaction_date!,
  );

  // 6. Test error scenario with invalid transaction ID
  await TestValidator.error(
    "invalid transaction ID update should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.transactions.updateTransaction(
        connection,
        {
          id: "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
          body: updateBody,
        },
      );
    },
  );

  // 7. Test unauthorized access by using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.telegramFileDownloader.administrator.transactions.updateTransaction(
      unauthenticatedConnection,
      {
        id: transactionId,
        body: updateBody,
      },
    );
  });
}
