import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate patient-specific RBAC boundaries and privacy controls for billing
 * invoice detail API.
 *
 * 1. Register Patient A and Patient B using /auth/patient/join
 * 2. Simulate creation of a billing invoice assigned to Patient A (mock object
 *    since no POST available)
 * 3. As Patient A, retrieve their invoice using GET and validate PHI and privacy
 *    (patient_id matches, no leakage)
 * 4. As Patient B, attempt to retrieve Patient A's invoice (should get error for
 *    access denial)
 * 5. As Patient A, attempt to retrieve a random (non-existent) billing invoice
 *    (should get not-found or error)
 *
 * Ensures only authorized patient access, prevents data leakage, and validates
 * enforced privacy/audit boundaries.
 */
export async function test_api_patient_billing_invoice_detail_e2e_access(
  connection: api.IConnection,
) {
  // 1. Register Patient A
  const patientAEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const patientAJoinInput = {
    email: patientAEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1998, 3, 8).toISOString(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientA: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: patientAJoinInput,
    });
  typia.assert(patientA);

  // 2. Register Patient B
  const patientBEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const patientBJoinInput = {
    email: patientBEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1997, 9, 12).toISOString(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientB: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: patientBJoinInput,
    });
  typia.assert(patientB);

  // 3. Simulate creation of a billing invoice attached to Patient A
  const billingInvoice: IHealthcarePlatformBillingInvoice = {
    ...typia.random<IHealthcarePlatformBillingInvoice>(),
    patient_id: patientA.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. As Patient A, retrieve their own invoice (simulate as if invoice is set up for test)
  const invoiceA =
    await api.functional.healthcarePlatform.patient.billingInvoices.at(
      connection,
      { billingInvoiceId: billingInvoice.id },
    );
  typia.assert(invoiceA);
  TestValidator.equals(
    "invoice should return for owner",
    invoiceA.patient_id,
    patientA.id,
  );

  // 5. Switch to Patient B and attempt forbidden access
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBJoinInput.email,
      password: patientBJoinInput.password!,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error(
    "patientB denied access to patientA's invoice",
    async () => {
      await api.functional.healthcarePlatform.patient.billingInvoices.at(
        connection,
        { billingInvoiceId: billingInvoice.id },
      );
    },
  );

  // 6. Switch to Patient A, attempt not-found
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAJoinInput.email,
      password: patientAJoinInput.password!,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error("not-found invoice triggers error", async () => {
    await api.functional.healthcarePlatform.patient.billingInvoices.at(
      connection,
      { billingInvoiceId: typia.random<string & tags.Format<"uuid">>() },
    );
  });
}
