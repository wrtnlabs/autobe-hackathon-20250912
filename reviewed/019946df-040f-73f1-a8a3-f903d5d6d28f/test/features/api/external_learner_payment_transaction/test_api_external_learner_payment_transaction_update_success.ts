import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * Test successful update of an existing external learner payment
 * transaction.
 *
 * This test follows the complete user flow:
 *
 * 1. Register a new external learner user.
 * 2. Create a payment transaction associated with the user.
 * 3. Update the payment transaction's amount and status.
 *
 * It validates proper token-based authentication, validates response types,
 * and ensures the update operation reflects correct changes.
 *
 * The test uses realistic data generated and thoroughly asserts the
 * returned data structures for type compliance and business logic
 * consistency.
 */
export async function test_api_external_learner_payment_transaction_update_success(
  connection: api.IConnection,
) {
  // Step 1. Register a new external learner user and authenticate
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const joinBody = {
    tenant_id: tenantId,
    email: email satisfies string & tags.Format<"email">,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorized: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(authorized);

  // Step 2. Create a payment transaction associated with this user
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  const createBody = {
    tenant_id: tenantId,
    user_id: authorized.id,
    transaction_code:
      "TXN-" + new Date().toISOString().replace(/[^0-9]/g, "") + "-0001",
    amount: 199.99,
    currency: "USD",
    payment_method: "credit_card",
    status: "pending",
    gateway_reference: null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
  } satisfies IEnterpriseLmsPaymentTransaction.ICreate;

  const transactionCreate: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.externalLearner.paymentTransactions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(transactionCreate);

  TestValidator.equals(
    "created transaction tenant_id",
    transactionCreate.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "created transaction user_id",
    transactionCreate.user_id,
    authorized.id,
  );
  TestValidator.equals(
    "created transaction amount",
    transactionCreate.amount,
    199.99,
  );
  TestValidator.equals(
    "created transaction currency",
    transactionCreate.currency,
    "USD",
  );
  TestValidator.equals(
    "created transaction status",
    transactionCreate.status,
    "pending",
  );

  // Step 3. Update payment transaction amount and status
  const updateBody = {
    amount: 249.99,
    status: "completed",
  } satisfies IEnterpriseLmsPaymentTransaction.IUpdate;

  const transactionUpdate: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.externalLearner.paymentTransactions.update(
      connection,
      {
        id: transactionCreate.id,
        body: updateBody,
      },
    );
  typia.assert(transactionUpdate);

  TestValidator.equals(
    "updated transaction id",
    transactionUpdate.id,
    transactionCreate.id,
  );
  TestValidator.equals(
    "updated transaction tenant_id",
    transactionUpdate.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "updated transaction user_id",
    transactionUpdate.user_id,
    authorized.id,
  );
  TestValidator.equals(
    "updated transaction amount",
    transactionUpdate.amount,
    249.99,
  );
  TestValidator.equals(
    "updated transaction currency",
    transactionUpdate.currency,
    "USD",
  );
  TestValidator.equals(
    "updated transaction status",
    transactionUpdate.status,
    "completed",
  );
  TestValidator.equals(
    "update transaction code unchanged",
    transactionUpdate.transaction_code,
    transactionCreate.transaction_code,
  );
}
