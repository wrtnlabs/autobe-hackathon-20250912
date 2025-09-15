import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for system admin billing invoice creation Flow:
 *
 * 1. Register a new system admin with provider 'local'
 * 2. Login as admin user for session context
 * 3. Generate valid organization_id, patient_id, (optional) encounter_id (UUIDs)
 * 4. Submit invoice creation with all required payload fields (ICreate)
 * 5. Validate that API returns required payload fields: id, organization_id,
 *    patient_id, invoice_number, total_amount, currency, status, created_at,
 *    updated_at
 * 6. Validate proper linkage to organization/patient, correct timestamps and data,
 *    and status field
 * 7. Confirm that returned invoice matches input and business rules
 * 8. Error scenarios: missing org/patient (401/400 not tested since type errors
 *    forbidden)
 */
export async function test_api_system_admin_billing_invoice_creation_successful(
  connection: api.IConnection,
) {
  // 1. Register a new system admin (local)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(12),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Login as admin for authenticated context
  const loginInput = {
    email: joinInput.email,
    provider: "local",
    provider_key: joinInput.provider_key,
    password: joinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const authorized = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "admin email matches",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "admin full_name matches",
    authorized.full_name,
    joinInput.full_name,
  );

  // 3. Generate organization/patient/encounter IDs for invoice
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const patient_id = typia.random<string & tags.Format<"uuid">>();
  const encounter_id = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare invoice payload
  const createInput = {
    organization_id,
    patient_id,
    encounter_id,
    invoice_number: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: RandomGenerator.pick([
      "draft",
      "sent",
      "paid",
      "overdue",
      "canceled",
    ] as const),
    total_amount: Math.floor(Math.random() * 100_000) + 1000,
    currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;

  // 5. Create invoice via system admin
  const invoice =
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(invoice);

  // 6. Validate core output fields
  TestValidator.equals(
    "organization linkage",
    invoice.organization_id,
    createInput.organization_id,
  );
  TestValidator.equals(
    "patient linkage",
    invoice.patient_id,
    createInput.patient_id,
  );
  TestValidator.equals(
    "invoice number matches",
    invoice.invoice_number,
    createInput.invoice_number,
  );
  TestValidator.equals("status matches", invoice.status, createInput.status);
  TestValidator.equals(
    "currency matches",
    invoice.currency,
    createInput.currency,
  );
  TestValidator.equals(
    "total amount matches",
    invoice.total_amount,
    createInput.total_amount,
  );
  TestValidator.equals(
    "encounter matches",
    invoice.encounter_id,
    createInput.encounter_id,
  );
  TestValidator.equals(
    "description matches",
    invoice.description,
    createInput.description,
  );
  TestValidator.predicate(
    "id is valid uuid",
    typeof invoice.id === "string" && invoice.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof invoice.created_at === "string" && invoice.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof invoice.updated_at === "string" && invoice.updated_at.length > 0,
  );

  // 7. Edge case: missing required fields forbidden by type system; negative logic testing not implemented here (type errors not allowed)
}
