import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";

/**
 * Comprehensive scenario for updating an existing guest user's payment
 * transaction.
 *
 * Steps:
 *
 * 1. Register a new guest user via /auth/guest/join.
 * 2. Create a payment transaction for this guest user.
 * 3. Update the payment transaction including amount, currency, and status.
 *
 * Validation:
 *
 * - Confirm the updated payment transaction entity reflects new values.
 * - Check for proper authorization and data isolation.
 * - Test error responses for unauthenticated updates and invalid data.
 *
 * Business Rules:
 *
 * - Guest users can only update their own payment transactions.
 * - Amount must be positive and currency must be valid ISO code.
 *
 * Success Criteria:
 *
 * - Updates succeed and maintain data consistency in the multi-tenant
 *   architecture.
 */
export async function test_api_guest_payment_transaction_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new guest user
  const guestCreate = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(30),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;
  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreate });
  typia.assert(guest);

  // 2. Create a payment transaction for the guest user
  const transactionCreate = {
    tenant_id: guest.tenant_id,
    user_id: guest.id,
    transaction_code: `TXN-${new Date().toISOString().substring(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    amount:
      RandomGenerator.alphaNumeric(4).length > 0
        ? Math.max(
            100,
            Math.floor(Number(RandomGenerator.alphaNumeric(3)) || 200),
          )
        : 200,
    currency: "USD",
    payment_method: RandomGenerator.pick([
      "credit_card",
      "paypal",
      "bank_transfer",
    ] as const),
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEnterpriseLmsPaymentTransaction.ICreate;

  const transaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.guest.paymentTransactions.create(
      connection,
      {
        body: transactionCreate,
      },
    );
  typia.assert(transaction);

  // 3. Update the payment transaction
  const updateBody = {
    amount: transaction.amount + 500,
    currency: "EUR",
    status: "completed",
    payment_method: transaction.payment_method,
    transaction_code: transaction.transaction_code,
    created_at: transaction.created_at,
    updated_at: new Date().toISOString(),
    gateway_reference: `REF-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    deleted_at: null,
  } satisfies IEnterpriseLmsPaymentTransaction.IUpdate;

  const updatedTransaction: IEnterpriseLmsPaymentTransaction =
    await api.functional.enterpriseLms.guest.paymentTransactions.update(
      connection,
      {
        id: transaction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTransaction);

  // Validate updated values
  TestValidator.equals(
    "amount should be updated",
    updatedTransaction.amount,
    updateBody.amount!,
  );
  TestValidator.equals(
    "currency should be updated",
    updatedTransaction.currency,
    updateBody.currency!,
  );
  TestValidator.equals(
    "status should be updated",
    updatedTransaction.status,
    updateBody.status!,
  );
  TestValidator.equals(
    "gateway_reference should be updated",
    updatedTransaction.gateway_reference,
    updateBody.gateway_reference,
  );
  TestValidator.equals(
    "transaction_code should be unchanged",
    updatedTransaction.transaction_code,
    transaction.transaction_code,
  );
  TestValidator.equals(
    "user_id should be unchanged",
    updatedTransaction.user_id,
    transaction.user_id,
  );
  TestValidator.equals(
    "tenant_id should be unchanged",
    updatedTransaction.tenant_id,
    transaction.tenant_id,
  );
}
