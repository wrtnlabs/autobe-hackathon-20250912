import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * This e2e test validates the successful creation of a payment transaction by a
 * guest user within the Enterprise LMS platform. The test involves:
 *
 * 1. Registering a guest user via the authentication guest join endpoint.
 * 2. Creating a payment transaction linked to the newly registered guest user.
 * 3. Validating that the payment transaction creation is successful, correctly
 *    linked to the tenant and user IDs, and response data matches expected
 *    types.
 *
 * The test ensures compliance with the required DTO schemas, proper handling of
 * authentication tokens, and business rule enforcement.
 */
export async function test_api_guest_payment_transaction_creation_successful(
  connection: api.IConnection,
) {
  // Step 1: Guest user registration payload
  const guestCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  // Step 2: Register guest user
  const authorizedGuest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateBody,
    });
  typia.assert(authorizedGuest);

  // Step 3: Prepare payment transaction create payload using guest data
  const nowIso = new Date().toISOString();

  // Construct transaction_code as 'TXN-YYYYMMDD-RANDOM6'
  const datePart = nowIso.slice(0, 10).replace(/-/g, "");
  const randomPart = RandomGenerator.alphaNumeric(6).toUpperCase();
  const transactionCode = `TXN-${datePart}-${randomPart}`;

  const paymentTransactionCreateBody = {
    tenant_id: authorizedGuest.tenant_id satisfies string as string,
    user_id: authorizedGuest.id satisfies string as string,
    transaction_code: transactionCode,
    amount: Number((Math.random() * 500 + 50).toFixed(2)),
    currency: "USD",
    payment_method: "credit card",
    status: "pending",
    gateway_reference: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  } satisfies IEnterpriseLmsPaymentTransaction.ICreate;

  // Step 4: Create payment transaction
  const paymentTransaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.guest.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  // Step 5: Validate the returned payment transaction matches the input
  TestValidator.equals(
    "tenant_id matches",
    paymentTransaction.tenant_id,
    paymentTransactionCreateBody.tenant_id,
  );
  TestValidator.equals(
    "user_id matches",
    paymentTransaction.user_id,
    paymentTransactionCreateBody.user_id,
  );
  TestValidator.equals(
    "transaction_code matches",
    paymentTransaction.transaction_code,
    paymentTransactionCreateBody.transaction_code,
  );
  TestValidator.predicate("amount positive", paymentTransaction.amount > 0);
  TestValidator.equals(
    "currency matches",
    paymentTransaction.currency,
    paymentTransactionCreateBody.currency,
  );
  TestValidator.equals(
    "payment_method matches",
    paymentTransaction.payment_method,
    paymentTransactionCreateBody.payment_method,
  );
  TestValidator.equals(
    "status matches",
    paymentTransaction.status,
    paymentTransactionCreateBody.status,
  );
  TestValidator.equals(
    "gateway_reference null",
    paymentTransaction.gateway_reference,
    null,
  );
  TestValidator.equals(
    "created_at matches",
    paymentTransaction.created_at,
    paymentTransactionCreateBody.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    paymentTransaction.updated_at,
    paymentTransactionCreateBody.updated_at,
  );
  TestValidator.equals("deleted_at null", paymentTransaction.deleted_at, null);
}
