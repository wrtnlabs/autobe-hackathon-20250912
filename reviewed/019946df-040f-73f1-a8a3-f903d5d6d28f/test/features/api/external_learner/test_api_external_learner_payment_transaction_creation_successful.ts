import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * This E2E test function validates the successful creation of a payment
 * transaction by an external learner.
 *
 * It performs the full workflow including:
 *
 * 1. External learner registration with tenant association via
 *    /auth/externalLearner/join.
 * 2. Using the authenticated context, submits a payment transaction creation
 *    request.
 *
 * The test ensures that the external learner is correctly created and that
 * the payment transaction record returned contains accurate and consistent
 * data linked to this learner and their tenant.
 *
 * The test strictly follows the defined DTO types and business rules,
 * verifies response correctness with typia.assert and business validation
 * with TestValidator.
 *
 * All required fields are present with realistic data, and no type
 * violations or invented properties are used.
 */
export async function test_api_external_learner_payment_transaction_creation_successful(
  connection: api.IConnection,
) {
  // Step 1: Register External Learner
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: `learner${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorizedLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(authorizedLearner);

  // Step 2: Create Payment Transaction
  const nowISOString = new Date().toISOString();
  const paymentBody = {
    tenant_id: authorizedLearner.tenant_id,
    user_id: authorizedLearner.id,
    transaction_code: `TXN-${nowISOString.substring(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    amount: Number((Math.random() * 1000 + 1).toFixed(2)),
    currency: "USD",
    payment_method: RandomGenerator.pick([
      "credit_card",
      "paypal",
      "bank_transfer",
    ] as const),
    status: "completed",
    gateway_reference: null,
    created_at: nowISOString,
    updated_at: nowISOString,
  } satisfies IEnterpriseLmsPaymentTransaction.ICreate;

  const paymentTransaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.externalLearner.paymentTransactions.create(
      connection,
      {
        body: paymentBody,
      },
    );
  typia.assert(paymentTransaction);

  TestValidator.equals(
    "tenant ID matches in payment transaction",
    paymentTransaction.tenant_id,
    authorizedLearner.tenant_id,
  );
  TestValidator.equals(
    "user ID matches in payment transaction",
    paymentTransaction.user_id,
    authorizedLearner.id,
  );
  TestValidator.equals(
    "transaction code matches",
    paymentTransaction.transaction_code,
    paymentBody.transaction_code,
  );
  TestValidator.equals(
    "payment method matches",
    paymentTransaction.payment_method,
    paymentBody.payment_method,
  );
  TestValidator.equals(
    "currency matches",
    paymentTransaction.currency,
    paymentBody.currency,
  );
  TestValidator.equals(
    "amount matches",
    paymentTransaction.amount,
    paymentBody.amount,
  );
  TestValidator.equals(
    "status matches",
    paymentTransaction.status,
    paymentBody.status,
  );
  TestValidator.equals(
    "gateway reference is null",
    paymentTransaction.gateway_reference,
    null,
  );
  TestValidator.equals(
    "created_at matches ISO 8601",
    paymentTransaction.created_at,
    paymentBody.created_at,
  );
  TestValidator.equals(
    "updated_at matches ISO 8601",
    paymentTransaction.updated_at,
    paymentBody.updated_at,
  );
}
