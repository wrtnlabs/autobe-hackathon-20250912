import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E - Create a billing invoice as healthcare organization admin
 *
 * 1. Register and login as organization admin
 * 2. Prepare valid organization_id, patient_id, encounter_id (simulate or use
 *    random UUIDs for patient and encounter as there's no explicit patient API
 *    here)
 * 3. Create a billing invoice with valid input referencing organization, patient,
 *    encounter
 * 4. Validate response contains all required fields, correct linkages, initial
 *    status, and not deleted
 * 5. Validate field values (amount, currency, date-time, etc.), and that no
 *    required field is missing
 * 6. Attempt business logic error: try to create invoice referencing an invalid
 *    patient UUID, confirm failure (no type errors are tested)
 */
export async function test_api_organization_billing_invoice_creation_successful(
  connection: api.IConnection,
) {
  // Onboard new organization admin (provisions account + assigns organization ID)
  const organizationAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "StrongP@ssw0rd1!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: organizationAdminBody },
  );
  typia.assert(orgAdminAuth);
  const organization_id = typia.random<string & tags.Format<"uuid">>(); // simulate valid org UUID

  // Login again to ensure authentication flow
  const loginResponse = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: organizationAdminBody.email,
        password: organizationAdminBody.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResponse);

  // Prepare invoice creation input
  const invoiceInput = {
    organization_id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    encounter_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "draft",
    total_amount: Math.floor(Math.random() * 9000 + 1000),
    currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;

  // Attempt invoice creation
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: invoiceInput },
    );
  typia.assert(invoice);

  // Validate all key fields
  TestValidator.equals(
    "organization linkage",
    invoice.organization_id,
    invoiceInput.organization_id,
  );
  TestValidator.equals(
    "patient linkage",
    invoice.patient_id,
    invoiceInput.patient_id,
  );
  TestValidator.equals(
    "encounter linkage",
    invoice.encounter_id,
    invoiceInput.encounter_id,
  );
  TestValidator.equals(
    "invoice_number",
    invoice.invoice_number,
    invoiceInput.invoice_number,
  );
  TestValidator.equals(
    "total_amount",
    invoice.total_amount,
    invoiceInput.total_amount,
  );
  TestValidator.equals("currency", invoice.currency, invoiceInput.currency);
  TestValidator.equals("status", invoice.status, invoiceInput.status);
  TestValidator.equals("not deleted", invoice.deleted_at, null);

  // Error case: attempt to create with invalid patient_id (must fail at business logic)
  await TestValidator.error("should fail for invalid patient_id", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          ...invoiceInput,
          patient_id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      },
    );
  });
}
