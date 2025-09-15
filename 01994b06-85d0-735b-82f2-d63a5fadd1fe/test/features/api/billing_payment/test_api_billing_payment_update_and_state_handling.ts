import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for updating details of a billing payment as organization admin,
 * covering:
 *
 * 1. Successful update of amount, memo, payment method
 * 2. Failing update with invalid payment_method_id (business error)
 * 3. Unauthorized update attempt by user with no credentials
 * 4. Update attempt for a non-existent payment Validates record state after update
 *    and that logical errors are enforced at API level.
 */
export async function test_api_billing_payment_update_and_state_handling(
  connection: api.IConnection,
) {
  // Organization admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: adminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create a billing invoice
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_number: RandomGenerator.alphaNumeric(12),
          status: "draft",
          total_amount: 1500,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // Create an initial payment method
  const paymentMethod =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
          method_type: "credit_card",
          provider_name: RandomGenerator.name(1),
          is_active: true,
        } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Create a payment
  const payment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.create(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          payment_method_id: paymentMethod.id,
          amount: 1000,
          currency: "USD",
          payment_date: new Date().toISOString(),
          memo: "Original payment",
          status: "posted",
        } satisfies IHealthcarePlatformBillingPayment.ICreate,
      },
    );
  typia.assert(payment);

  // Create another payment method for update
  const newPaymentMethod =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
          method_type: "insurance",
          provider_name: RandomGenerator.name(1),
          is_active: true,
        } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate,
      },
    );
  typia.assert(newPaymentMethod);

  // 1. Successful update: amount, memo, payment_method_id
  const newMemo = "Updated payment memo";
  const newAmount = 1200;
  const updatedPayment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.update(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingPaymentId: payment.id,
        body: {
          amount: newAmount,
          memo: newMemo,
          payment_method_id: newPaymentMethod.id,
        } satisfies IHealthcarePlatformBillingPayment.IUpdate,
      },
    );
  typia.assert(updatedPayment);
  TestValidator.equals("memo updated", updatedPayment.memo, newMemo);
  TestValidator.equals("amount updated", updatedPayment.amount, newAmount);
  TestValidator.equals(
    "payment method updated",
    updatedPayment.payment_method_id,
    newPaymentMethod.id,
  );
  TestValidator.notEquals(
    "updated_at changed on update",
    updatedPayment.updated_at,
    payment.updated_at,
  );

  // 2. Error: invalid payment method id (using a random UUID not present as a payment method)
  await TestValidator.error(
    "invalid payment method id triggers error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentId: payment.id,
          body: {
            payment_method_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformBillingPayment.IUpdate,
        },
      );
    },
  );

  // 3. Unauthorized update as a connection with no auth headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update as unauthorized user should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.update(
        unauthConn,
        {
          billingInvoiceId: invoice.id,
          billingPaymentId: payment.id,
          body: {
            amount: 9999,
          } satisfies IHealthcarePlatformBillingPayment.IUpdate,
        },
      );
    },
  );

  // 4. Attempt to update a non-existent payment
  await TestValidator.error(
    "update non-existent payment triggers error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingPayments.update(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingPaymentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            amount: 1500,
          } satisfies IHealthcarePlatformBillingPayment.IUpdate,
        },
      );
    },
  );
}
