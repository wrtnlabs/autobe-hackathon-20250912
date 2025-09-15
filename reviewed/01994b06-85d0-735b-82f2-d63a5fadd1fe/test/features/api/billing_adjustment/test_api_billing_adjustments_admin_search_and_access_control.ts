import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingAdjustment";

/**
 * Validate search, pagination, and access control for system admin billing
 * adjustments search endpoint.
 *
 * This test validates the end-to-end workflow for system administrators
 * searching for billing adjustments on billing invoices, including access
 * control boundaries and error edge cases.
 *
 * Steps:
 *
 * 1. Register and authenticate as a system administrator.
 * 2. Use a known or randomly generated (assumed existing) billingInvoiceId
 *    (since no creation API exists).
 * 3. Perform a PATCH operation using
 *    /systemAdmin/billingInvoices/{billingInvoiceId}/billingAdjustments
 *    with typical search params: by invoice and default pagination.
 * 4. Assert success and that a page of billing adjustment data and pagination
 *    metadata is returned, of expected structure.
 * 5. Attempt to access the endpoint with an unauthenticated connection and
 *    expect access denied error.
 * 6. Attempt to search for a totally random, likely-nonexistent
 *    billingInvoiceId and expect an error or empty result.
 */
export async function test_api_billing_adjustments_admin_search_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register and login as a system administrator
  const sysAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminProviderKey = RandomGenerator.alphabets(8);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminProviderKey,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 2. Login again as system admin to set fresh token
  const sysAdminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminProviderKey,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(sysAdminAuth);

  // 3. Assume a valid billing invoice id (in a real-world test, ID would be from DB seed or fixture; here we use a random one)
  const validBillingInvoiceId = typia.random<string & tags.Format<"uuid">>();

  // 4. Search as system admin for assumed invoice id.
  const searchBody = {
    invoice_id: validBillingInvoiceId,
    page: 1,
    pageSize: 10,
  } satisfies IHealthcarePlatformBillingAdjustment.IRequest;

  const adjustmentsPage =
    await api.functional.healthcarePlatform.systemAdmin.billingInvoices.billingAdjustments.index(
      connection,
      {
        billingInvoiceId: validBillingInvoiceId,
        body: searchBody,
      },
    );
  typia.assert(adjustmentsPage);
  TestValidator.predicate(
    "adjustmentsPage has pagination metadata",
    !!adjustmentsPage.pagination,
  );
  TestValidator.predicate(
    "adjustmentsPage data is array",
    Array.isArray(adjustmentsPage.data),
  );

  // 5. Attempt access without authentication (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin cannot access billing adjustments",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingInvoices.billingAdjustments.index(
        unauthConn,
        {
          billingInvoiceId: validBillingInvoiceId,
          body: searchBody,
        },
      );
    },
  );

  // 6. Attempt search for nonexistent billing invoice id
  const invalidBillingInvoiceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "searching for nonexistent billingInvoiceId as admin throws error or gives empty page",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingInvoices.billingAdjustments.index(
        connection,
        {
          billingInvoiceId: invalidBillingInvoiceId,
          body: {
            invoice_id: invalidBillingInvoiceId,
            page: 1,
            pageSize: 10,
          } satisfies IHealthcarePlatformBillingAdjustment.IRequest,
        },
      );
    },
  );
}
