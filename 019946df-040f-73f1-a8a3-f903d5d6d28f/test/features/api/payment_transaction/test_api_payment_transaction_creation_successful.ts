import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * This E2E test validates the successful creation of a payment transaction
 * by a corporate learner.
 *
 * The scenario includes:
 *
 * 1. Corporate learner registration with tenant_id and user details.
 * 2. Corporate learner login with email and password.
 * 3. Creation of a payment transaction belonging to the authenticated
 *    learner's tenant and user.
 *
 * Each API response is asserted for proper type compliance. The payment
 * transaction creation input uses realistic, schema-compliant random data.
 *
 * Validation steps ensure tenant isolation by comparing tenant_id and
 * user_id fields between the learner and created transaction.
 */
export async function test_api_payment_transaction_creation_successful(
  connection: api.IConnection,
) {
  // 1. Corporate learner joins the system
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const password = "SuperSafePassword123!";
  const joinBody = {
    tenant_id: tenantId,
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const joinedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);
  TestValidator.predicate(
    "join returns a valid JWT token",
    joinedUser.token !== undefined &&
      typeof joinedUser.token.access === "string" &&
      joinedUser.token.access.length > 0,
  );

  // 2. Corporate learner logs in
  const loginBody = {
    email: joinBody.email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);
  TestValidator.predicate(
    "login returns a valid JWT token",
    loggedInUser.token !== undefined &&
      typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );

  // 3. Create a payment transaction
  const nowISOString = new Date().toISOString();
  const paymentTransactionCreateBody = {
    tenant_id: joinedUser.tenant_id,
    user_id: joinedUser.id,
    transaction_code: `TXN-${nowISOString.slice(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    amount: Number((Math.random() * 1000 + 50).toFixed(2)), // realistic amount between 50.00 and 1050.00
    currency: RandomGenerator.pick([
      "USD",
      "EUR",
      "KRW",
      "JPY",
      "GBP",
    ] as const),
    payment_method: RandomGenerator.pick([
      "credit_card",
      "paypal",
      "bank_transfer",
    ] as const),
    status: RandomGenerator.pick(["pending", "completed", "failed"] as const),
    gateway_reference: null,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies IEnterpriseLmsPaymentTransaction.ICreate;

  const createdTransaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.corporateLearner.paymentTransactions.create(
      connection,
      { body: paymentTransactionCreateBody },
    );
  typia.assert(createdTransaction);

  // Validations
  TestValidator.equals(
    "tenant_id in created payment matches joined user",
    createdTransaction.tenant_id,
    joinedUser.tenant_id,
  );

  TestValidator.equals(
    "user_id in created payment matches joined user",
    createdTransaction.user_id,
    joinedUser.id,
  );

  TestValidator.predicate(
    "created transaction amount is positive",
    createdTransaction.amount > 0,
  );

  TestValidator.predicate(
    "created transaction currency is ISO code string",
    ["USD", "EUR", "KRW", "JPY", "GBP"].includes(createdTransaction.currency),
  );
}
