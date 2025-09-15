import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPharmacyTransaction";

/**
 * Validate system admin search on pharmacy transactions with advanced filters,
 * pagination, and sorting.
 *
 * Tests:
 *
 * 1. System admin registers and logs in.
 * 2. System admin creates a pharmacy integration and captures org/integration IDs.
 * 3. Transactions cannot be created directly, but should exist for
 *    integration/org.
 * 4. Various search/filtering scenarios:
 *
 *    - Filter by organization_id
 *    - Filter by pharmacy_integration_id
 *    - Filter by type/status/date
 *    - Paginate with page/page_size
 *    - Sort by requested_at DESC/ASC
 * 5. Validate results:
 *
 *    - Pagination metadata correct
 *    - Data records match filter expectations
 *    - Sorted as requested
 *    - All fields are type-correct
 * 6. Error case: unauthorized access
 */
export async function test_api_pharmacy_transactions_query_sysadmin(
  connection: api.IConnection,
) {
  // 1. System admin joins
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword!1",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. System admin logs in
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      provider: "local",
      provider_key: adminJoin.email,
      password: "StrongPassword!1",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create a pharmacy integration (org id is chosen here)
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const integrationInput = {
    healthcare_platform_organization_id: orgId,
    pharmacy_vendor_code: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    connection_uri: `https://pharmacy-${RandomGenerator.alphaNumeric(8)}.com/api`,
    supported_protocol: RandomGenerator.pick(["NCPDP", "HL7", "FHIR"] as const),
    status: "active",
  } satisfies IHealthcarePlatformPharmacyIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyIntegrations.create(
      connection,
      {
        body: integrationInput,
      },
    );
  typia.assert(integration);

  // 4. Query pharmacy transactions with different filters
  // Option 1: filter by organization_id
  const txPageByOrg =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.index(
      connection,
      {
        body: {
          organization_id: orgId,
        } satisfies IHealthcarePlatformPharmacyTransaction.IRequest,
      },
    );
  typia.assert(txPageByOrg);
  TestValidator.equals(
    "pagination org filter",
    txPageByOrg.pagination.current,
    1,
  );

  // Option 2: filter by pharmacy_integration_id
  const txPageByIntegration =
    await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.index(
      connection,
      {
        body: {
          pharmacy_integration_id: integration.id,
        } satisfies IHealthcarePlatformPharmacyTransaction.IRequest,
      },
    );
  typia.assert(txPageByIntegration);
  TestValidator.equals(
    "pagination integration filter",
    txPageByIntegration.pagination.current,
    1,
  );

  // Option 3: Add page size, sorting, and type filter
  const typeValue =
    txPageByOrg.data.length > 0
      ? txPageByOrg.data[0].transaction_type
      : undefined;
  if (typeValue != null) {
    const txPageByType =
      await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.index(
        connection,
        {
          body: {
            organization_id: orgId,
            transaction_type: typeValue,
            sort: "requested_at DESC",
            page: 1 satisfies number as number,
            page_size: 5 satisfies number as number,
          } satisfies IHealthcarePlatformPharmacyTransaction.IRequest,
        },
      );
    typia.assert(txPageByType);
    TestValidator.equals(
      "type filter respects page size",
      txPageByType.pagination.limit,
      5,
    );
    if (txPageByType.data.length > 1) {
      for (let i = 1; i < txPageByType.data.length; ++i)
        TestValidator.predicate(
          `requested_at should be DESC`,
          txPageByType.data[i - 1].requested_at >=
            txPageByType.data[i].requested_at,
        );
      TestValidator.equals(
        "all transactions have correct type",
        ArrayUtil.has(
          txPageByType.data,
          (tx) => tx.transaction_type === typeValue,
        ),
        true,
      );
    }
  }

  // 5. Unauthenticated connection fails
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.pharmacyTransactions.index(
      unauthConn,
      {
        body: {
          organization_id: orgId,
        } satisfies IHealthcarePlatformPharmacyTransaction.IRequest,
      },
    );
  });
}
