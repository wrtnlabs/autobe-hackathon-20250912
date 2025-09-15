import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin can view full adjustment details with audit fields,
 * RBAC, and compliance.
 *
 * 1. Register/login as system admin (SA)
 * 2. Register/login as organization admin (OA)
 * 3. SA creates dummy billing invoice (org+patient)
 * 4. OA creates a billing adjustment on the invoice, holding
 *    adjustment/invoice IDs
 * 5. Switch back to SA, fetch adjustment using GET endpoint
 * 6. Validate returned object fields (amount, adjustment_type, linkage,
 *    created_at)
 * 7. Try fetching as unauthenticated (should error)
 * 8. Try nonexistent adjustment ID (should error)
 */
export async function test_api_billing_adjustment_detail_viewing_with_audit_trail(
  connection: api.IConnection,
) {
  // 1. Register/login as system admin (SA)
  const saEmail = typia.random<string & tags.Format<"email">>();
  const saPassword = RandomGenerator.alphaNumeric(8);
  const saJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: saEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(saJoin);

  const saLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: saEmail,
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(saLogin);

  // 2. Register/login as organization admin (OA)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(8);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // 3. SA creates dummy billing invoice (org+patient)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: saEmail,
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const invoiceData = {
    organization_id: orgAdminJoin.id,
    patient_id: patientId,
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 1000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.create(
      connection,
      { body: invoiceData },
    );
  typia.assert(invoice);

  // 4. OA creates a billing adjustment for the invoice
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const adjustmentData = {
    invoice_id: invoice.id,
    adjustment_type: "write-off",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    amount: -100,
  } satisfies IHealthcarePlatformBillingAdjustment.ICreate;
  const adjustment =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingAdjustments.create(
      connection,
      { billingInvoiceId: invoice.id, body: adjustmentData },
    );
  typia.assert(adjustment);

  // 5. Switch back to SA and fetch the adjustment
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: saEmail,
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const result =
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.billingAdjustments.at(
      connection,
      {
        billingInvoiceId: invoice.id,
        billingAdjustmentId: adjustment.id,
      },
    );
  typia.assert(result);
  TestValidator.equals("adjustment id matches", result.id, adjustment.id);
  TestValidator.equals(
    "adjustment value matches",
    result.amount,
    adjustment.amount,
  );
  TestValidator.equals(
    "adjustment type matches",
    result.adjustment_type,
    adjustment.adjustment_type,
  );
  TestValidator.equals(
    "invoice linkage matches",
    result.invoice_id,
    invoice.id,
  );
  TestValidator.predicate(
    "has created_at",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );

  // 6. Try fetching as unauthenticated (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.billingAdjustments.at(
      unauthConn,
      {
        billingInvoiceId: invoice.id,
        billingAdjustmentId: adjustment.id,
      },
    );
  });

  // 7. Try nonexistent adjustment ID (should error)
  await TestValidator.error(
    "not found when adjustment id does not exist",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingInvoices.billingAdjustments.at(
        connection,
        {
          billingInvoiceId: invoice.id,
          billingAdjustmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
