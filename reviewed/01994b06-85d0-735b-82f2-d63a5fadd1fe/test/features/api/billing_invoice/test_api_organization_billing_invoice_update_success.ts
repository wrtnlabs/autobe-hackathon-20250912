import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin updates a billing invoice: validate update, response
 * integrity, unchanged relationships, compliance/audit, and error handling for
 * bad IDs.
 */
export async function test_api_organization_billing_invoice_update_success(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // Register admin (join)
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);

  // Login as admin to ensure valid session (optional but ensures role context)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Create a mock existing invoice since the API for invoice creation is not given
  const mockInvoice: IHealthcarePlatformBillingInvoice =
    typia.random<IHealthcarePlatformBillingInvoice>();

  // 3. Prepare the update body: change status, description, due_date
  const updatedStatus = RandomGenerator.pick([
    "draft",
    "sent",
    "paid",
    "overdue",
    "canceled",
  ] as const);
  const updatedDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody = {
    status: updatedStatus,
    due_date: updatedDueDate,
    description: updatedDescription,
  } satisfies IHealthcarePlatformBillingInvoice.IUpdate;

  // 4. Perform the update
  const updatedInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.update(
      connection,
      {
        billingInvoiceId: mockInvoice.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInvoice);

  // 5. Assert updated fields while relationships remain constant
  TestValidator.equals(
    "invoice id remains the same",
    updatedInvoice.id,
    mockInvoice.id,
  );
  TestValidator.equals(
    "organization_id unchanged",
    updatedInvoice.organization_id,
    mockInvoice.organization_id,
  );
  TestValidator.equals(
    "patient_id unchanged",
    updatedInvoice.patient_id,
    mockInvoice.patient_id,
  );
  TestValidator.equals(
    "invoice_number unchanged",
    updatedInvoice.invoice_number,
    mockInvoice.invoice_number,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedInvoice.currency,
    mockInvoice.currency,
  );
  TestValidator.equals(
    "total_amount unchanged",
    updatedInvoice.total_amount,
    mockInvoice.total_amount,
  );
  TestValidator.equals("status updated", updatedInvoice.status, updatedStatus);
  TestValidator.equals(
    "due_date updated",
    updatedInvoice.due_date,
    updatedDueDate,
  );
  TestValidator.equals(
    "description updated",
    updatedInvoice.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "updated_at is updated after created_at",
    new Date(updatedInvoice.updated_at) >= new Date(updatedInvoice.created_at),
  );

  // 6. Attempt update with invalid invoice ID for negative case
  await TestValidator.error(
    "update with invalid invoice ID should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.update(
        connection,
        {
          billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
