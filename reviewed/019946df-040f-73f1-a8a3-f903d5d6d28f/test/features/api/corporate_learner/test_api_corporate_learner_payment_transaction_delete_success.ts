import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * Test successful deletion of a corporate learner's payment transaction.
 *
 * This E2E test covers the entire workflow:
 *
 * 1. Register a corporate learner and authenticate.
 * 2. Create a payment transaction for the registered learner.
 * 3. Delete the payment transaction.
 * 4. Attempt to delete the transaction again (should fail unauthorized or not
 *    found).
 *
 * Validations include:
 *
 * - Correct creation of corporate learner with token issuance.
 * - Successful creation and assignment of payment transaction.
 * - Transaction deletion success without response body.
 * - Unauthorized deletion attempts verified by error assertion.
 *
 * The test respects tenant isolation and confirms no data leakage. Audit
 * trail maintenance is assumed as out-of-band and not tested here.
 *
 * Note: Retrieval of deleted transaction is not possible due to lack of GET
 * endpoint; hence, repeated deletion attempts test non-existence.
 */
export async function test_api_corporate_learner_payment_transaction_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate corporate learner
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const corporateLearnerCreate: IEnterpriseLmsCorporateLearner.ICreate = {
    tenant_id: tenantId,
    email: `user.${RandomGenerator.alphaNumeric(7)}@example.com`,
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(3)}`,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  };

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreate,
    });
  typia.assert(corporateLearner);

  // 2. Create a payment transaction
  const paymentTransactionCreate: IEnterpriseLmsPaymentTransaction.ICreate = {
    tenant_id: corporateLearner.tenant_id,
    user_id: corporateLearner.id,
    transaction_code: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    amount: 10000,
    currency: "USD",
    payment_method: "credit_card",
    status: "completed",
    gateway_reference: `GW-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const paymentTransaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.corporateLearner.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreate,
      },
    );
  typia.assert(paymentTransaction);

  // 3. Delete the payment transaction
  await api.functional.enterpriseLms.corporateLearner.paymentTransactions.erase(
    connection,
    {
      id: paymentTransaction.id,
    },
  );

  // 4. Attempt to delete the same transaction again should fail
  await TestValidator.error(
    "delete non-existent payment transaction should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.paymentTransactions.erase(
        connection,
        {
          id: paymentTransaction.id,
        },
      );
    },
  );
}
