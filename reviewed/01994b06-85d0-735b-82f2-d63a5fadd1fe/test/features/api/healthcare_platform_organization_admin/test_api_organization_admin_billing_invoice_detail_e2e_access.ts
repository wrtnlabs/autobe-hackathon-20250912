import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin attempts to access billing invoice details, verifying only
 * RBAC/business error boundaries as no invoice creation/listing endpoint is
 * available.
 *
 * 1. Register an organization admin and login to establish auth context
 * 2. Attempt to access any random billing invoice ID (should fail with error as
 *    the invoice does not exist or is not accessible)
 * 3. Attempt to access a specific known-nonexistent billingInvoiceId (all-zeros
 *    UUID; should fail with not found error)
 *
 * Positive business logic (accessing an actual invoice belonging to the org) is
 * not tested due to the lack of data seeding capabilities via exposed
 * endpoints.
 */
export async function test_api_organization_admin_billing_invoice_detail_e2e_access(
  connection: api.IConnection,
) {
  // 1. Register and login as the organization admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "securePassword!1A",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoin },
  );
  typia.assert(adminAuth);
  const login = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      password: adminJoin.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(login);

  // 2. Attempt to retrieve a random invoice not belonging to this org (expect error)
  await TestValidator.error(
    "cannot access random invoice as organization admin",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.at(
        connection,
        {
          billingInvoiceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Attempt to retrieve a totally invalid billingInvoiceId (should always 404/not found)
  await TestValidator.error(
    "not found error for all-zero UUID billingInvoiceId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.at(
        connection,
        {
          billingInvoiceId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
