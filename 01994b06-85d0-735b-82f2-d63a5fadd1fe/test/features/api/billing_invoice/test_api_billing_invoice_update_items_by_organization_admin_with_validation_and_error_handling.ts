import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingItem";

/**
 * Validate billing invoice billing items operations as an organization admin -
 * index/search only.
 *
 * Business flow:
 *
 * 1. Register and login as an organization admin
 * 2. Create a billing invoice for a random organization and patient
 * 3. Create a billing code (for linkage in other scenarios)
 * 4. Use the PATCH endpoint for billing items to search for items linked to
 *    invoice (should be empty)
 * 5. Validate that PATCH returns empty data for a new invoice
 * 6. PATCH with valid filter (should be empty as well)
 * 7. Ensure forbidden access if connection is unauthorized Note: No direct
 *    creation or updating of items is tested (API not available)
 */
export async function test_api_billing_invoice_update_items_by_organization_admin_with_validation_and_error_handling(
  connection: api.IConnection,
) {
  // 1. Register as organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    },
  });

  // 3. Create a billing invoice
  const billingInvoiceCreateBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_number: RandomGenerator.alphaNumeric(12),
    status: "draft",
    total_amount: 10000,
    currency: "USD",
  } satisfies IHealthcarePlatformBillingInvoice.ICreate;
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: billingInvoiceCreateBody,
      },
    );
  typia.assert(invoice);

  // 4. Create a billing code
  const billingCodeBody = {
    code: RandomGenerator.alphaNumeric(5),
    code_system: "CPT",
    name: RandomGenerator.name(),
    active: true,
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const billingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: billingCodeBody,
      },
    );
  typia.assert(billingCode);

  // 5. Search billing items for the invoice (should be empty since no items exist)
  const billingItemsPage =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {},
      },
    );
  typia.assert(billingItemsPage);
  TestValidator.equals(
    "empty billing item list on new invoice",
    billingItemsPage.data.length,
    0,
  );

  // 6. Search with valid filter
  const billingItemsFiltered =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.index(
      connection,
      {
        billingInvoiceId: invoice.id,
        body: {
          invoice_id: invoice.id,
          limit: 10,
        },
      },
    );
  typia.assert(billingItemsFiltered);
  TestValidator.equals(
    "filtered item list still empty",
    billingItemsFiltered.data.length,
    0,
  );

  // 7. Error: unauthorized connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access denied for billingItems.index",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.billingItems.index(
        unauthConn,
        {
          billingInvoiceId: invoice.id,
          body: {},
        },
      );
    },
  );
}
