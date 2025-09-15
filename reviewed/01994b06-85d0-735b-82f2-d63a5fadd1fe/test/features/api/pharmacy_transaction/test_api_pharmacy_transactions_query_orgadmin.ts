import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import type { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPharmacyTransaction";

/**
 * Validate that organization admin can query pharmacy transactions within the
 * correct organization context using proper filters, and is restricted from
 * querying data outside the organization's scope.
 *
 * Steps:
 *
 * 1. Register and authenticate an organization admin.
 * 2. Create a pharmacy integration and extract organization_id and
 *    pharmacy_integration_id.
 * 3. Assume (or setup) that pharmacy transactions exist for the integration.
 * 4. Query transactions: a) By organization_id and pharmacy_integration_id b) With
 *    various filters for date range, transaction type, and status c) Paginate
 *    results with page and page_size d) Attempt queries with out-of-scope
 *    filters (e.g., random organization_id or pharmacy_integration_id) and
 *    expect empty or logical error response
 * 5. Validate that only in-scope data is returned for organization admin, and edge
 *    case filters do not result in type or HTTP status code errors
 */
export async function test_api_pharmacy_transactions_query_orgadmin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate organization admin
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email,
      full_name,
      password,
      phone: RandomGenerator.mobile(),
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create pharmacy integration
  const orgId = admin.id;
  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          pharmacy_vendor_code: RandomGenerator.name(1),
          connection_uri: `https://${RandomGenerator.alphaNumeric(8)}.api.com`,
          supported_protocol: RandomGenerator.pick(["NCPDP", "FHIR"] as const),
          status: RandomGenerator.pick([
            "active",
            "pending",
            "failed",
            "disabled",
          ] as const),
        } satisfies IHealthcarePlatformPharmacyIntegration.ICreate,
      },
    );
  typia.assert(integration);

  // Step 3: Query transactions by organization and integration scope
  const baseQuery = {
    organization_id: integration.healthcare_platform_organization_id,
    pharmacy_integration_id: integration.id,
    page: 1,
    page_size: 5,
    sort: undefined,
  } satisfies IHealthcarePlatformPharmacyTransaction.IRequest;
  const queryResponse =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
      connection,
      {
        body: baseQuery,
      },
    );
  typia.assert(queryResponse);
  TestValidator.equals(
    "organization_id matches",
    queryResponse.data.length === 0
      ? integration.healthcare_platform_organization_id
      : queryResponse.data[0].healthcare_platform_organization_id,
    integration.healthcare_platform_organization_id,
  );

  // Step 4: Add additional filter scenarios if any transactions are present
  if (queryResponse.data.length > 0) {
    const sampleTx = queryResponse.data[0];
    // Filter by type
    const typeResponse =
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
        connection,
        {
          body: {
            ...baseQuery,
            transaction_type: sampleTx.transaction_type,
          },
        },
      );
    typia.assert(typeResponse);
    TestValidator.predicate(
      "all transaction_type match",
      typeResponse.data.every(
        (tx) => tx.transaction_type === sampleTx.transaction_type,
      ),
    );
    // Filter by status
    const statusResponse =
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
        connection,
        {
          body: {
            ...baseQuery,
            status: sampleTx.status,
          },
        },
      );
    typia.assert(statusResponse);
    TestValidator.predicate(
      "all status match",
      statusResponse.data.every((tx) => tx.status === sampleTx.status),
    );
    // Date range filter
    const startDate = sampleTx.requested_at;
    const endDate = sampleTx.requested_at;
    const dateResponse =
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
        connection,
        {
          body: {
            ...baseQuery,
            transaction_date_range: [startDate, endDate],
          },
        },
      );
    typia.assert(dateResponse);
    TestValidator.predicate(
      "all requested_at within range",
      dateResponse.data.every(
        (tx) => tx.requested_at >= startDate && tx.requested_at <= endDate,
      ),
    );
    // Pagination
    const page2Response =
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
        connection,
        {
          body: {
            ...baseQuery,
            page: 2,
          },
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "pagination works (no crash)",
      page2Response.pagination.current,
      2,
    );
  }
  // Step 5: Out-of-scope filter (random org, random integration)
  const dummyUuid = typia.random<string & tags.Format<"uuid">>();
  const outOfScopeResponse =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
      connection,
      {
        body: {
          ...baseQuery,
          organization_id: dummyUuid,
        },
      },
    );
  typia.assert(outOfScopeResponse);
  TestValidator.equals(
    "out-of-scope org returns no transactions",
    outOfScopeResponse.data.length,
    0,
  );

  const outOfScopeIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyTransactions.index(
      connection,
      {
        body: {
          ...baseQuery,
          pharmacy_integration_id: dummyUuid,
        },
      },
    );
  typia.assert(outOfScopeIntegration);
  TestValidator.equals(
    "out-of-scope integration returns no transactions",
    outOfScopeIntegration.data.length,
    0,
  );
}
