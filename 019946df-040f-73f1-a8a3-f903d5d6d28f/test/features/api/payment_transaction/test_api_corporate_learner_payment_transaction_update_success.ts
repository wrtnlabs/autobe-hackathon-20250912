import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * E2E Test for successful update of a corporate learner's payment
 * transaction.
 *
 * This test simulates a real business workflow in the Enterprise LMS system
 * where:
 *
 * 1. A new corporate learner is registered and authenticated.
 * 2. A valid payment transaction is created for this learner.
 * 3. The existing payment transaction is updated with new valid data.
 * 4. The test verifies that the updated transaction reflects the changes
 *    accurately.
 *
 * Validation includes ensuring amount is positive, currency code is valid
 * ISO 4217, and the status is an allowed string value. Additionally, the
 * test covers error cases for unauthorized update attempts, updating
 * non-existent transaction IDs, and invalid inputs, confirming proper error
 * handling.
 *
 * The test maintains strict type safety with exact DTO types and uses
 * typia.assert for response validation. Authentication is handled securely
 * via provided APIs.
 *
 * The test flow mirrors realistic system usage to guarantee business rule
 * compliance and data integrity within tenant scope.
 */
export async function test_api_corporate_learner_payment_transaction_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new corporate learner account
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const learnerEmail: string =
    RandomGenerator.alphaNumeric(6) + "@corporate.com";
  const learnerPassword = "ValidPass123!";
  const learnerFirstName = RandomGenerator.name(1);
  const learnerLastName = RandomGenerator.name(1);

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: learnerEmail,
        password: learnerPassword,
        first_name: learnerFirstName,
        last_name: learnerLastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(corporateLearner);

  // Step 2: Create a payment transaction for this corporate learner
  const paymentTransactionCreateBody = {
    tenant_id: tenantId,
    user_id: corporateLearner.id,
    transaction_code:
      "TXN-" +
      new Date().toISOString().replace(/[-:.TZ]/g, "") +
      "-" +
      Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0"),
    amount: Math.floor(Math.random() * 1000) + 100, // realistic positive amount between 100 and 1099
    currency: "USD",
    payment_method: "credit_card",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEnterpriseLmsPaymentTransaction.ICreate;

  const paymentTransactionCreated: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.corporateLearner.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransactionCreated);
  TestValidator.equals(
    "created transaction user ID equals learner ID",
    paymentTransactionCreated.user_id,
    corporateLearner.id,
  );

  // Step 3: Update the existing payment transaction with valid fields
  const updatedAmount = paymentTransactionCreated.amount + 50;
  const updatedStatus = "completed";
  const paymentTransactionUpdateBody = {
    amount: updatedAmount,
    status: updatedStatus,
    updated_at: new Date().toISOString(),
  } satisfies IEnterpriseLmsPaymentTransaction.IUpdate;

  const paymentTransactionUpdated: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.corporateLearner.paymentTransactions.update(
      connection,
      {
        id: paymentTransactionCreated.id,
        body: paymentTransactionUpdateBody,
      },
    );
  typia.assert(paymentTransactionUpdated);

  // Step 4: Validate update correctness
  TestValidator.equals(
    "updated transaction amount",
    paymentTransactionUpdated.amount,
    updatedAmount,
  );
  TestValidator.equals(
    "updated transaction status",
    paymentTransactionUpdated.status,
    updatedStatus,
  );
  TestValidator.equals(
    "unchanged transaction code",
    paymentTransactionUpdated.transaction_code,
    paymentTransactionCreated.transaction_code,
  );
  TestValidator.equals(
    "unchanged user id",
    paymentTransactionUpdated.user_id,
    paymentTransactionCreated.user_id,
  );
  TestValidator.equals(
    "unchanged tenant id",
    paymentTransactionUpdated.tenant_id,
    paymentTransactionCreated.tenant_id,
  );

  // Step 5: Test error case - unauthorized user update attempt
  // Attempt update with new unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.enterpriseLms.corporateLearner.paymentTransactions.update(
      unauthenticatedConnection,
      {
        id: paymentTransactionCreated.id,
        body: paymentTransactionUpdateBody,
      },
    );
  });

  // Step 6: Test error case - update non-existent transaction ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with non-existent ID should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.paymentTransactions.update(
        connection,
        {
          id: nonExistentId,
          body: paymentTransactionUpdateBody,
        },
      );
    },
  );

  // Step 7: Test error case - invalid input data: negative amount
  const invalidUpdateBody = {
    amount: -100,
    status: "failed",
    updated_at: new Date().toISOString(),
  } satisfies IEnterpriseLmsPaymentTransaction.IUpdate;
  await TestValidator.error(
    "update with negative amount should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.paymentTransactions.update(
        connection,
        {
          id: paymentTransactionCreated.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
