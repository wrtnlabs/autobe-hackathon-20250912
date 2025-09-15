import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResultImport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResultImport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabResultImport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResultImport";

/**
 * Test search of lab result import records by organization/labIntegration
 * filtering as org admin, with edge cases for correct filtering, error
 * handling, and permission.
 *
 * Workflow:
 *
 * 1. Join/register as organization admin (acquire auth context)
 * 2. Create a lab integration (get IDs: organizationId & labIntegrationId)
 * 3. Perform lab result import search API with:
 *
 *    - Valid organizationId+labIntegrationId (should get records belonging to that
 *         integration)
 *    - Wrong/fake labIntegrationId/organizationId (should get empty result)
 *    - No filters (should return paginated data)
 *    - Unauthenticated context (should error)
 * 4. Validate all responses structure & filtering logic, permission enforcement
 */
export async function test_api_lab_result_import_search_with_filtering(
  connection: api.IConnection,
) {
  // 1. Register as an organization admin
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Create a lab integration
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: adminJoin.id,
          lab_vendor_code: RandomGenerator.alphaNumeric(6),
          connection_uri: `https://labs.example.com/${RandomGenerator.alphaNumeric(8)}`,
          supported_message_format: "FHIR R4",
          status: "active",
        } satisfies IHealthcarePlatformLabIntegration.ICreate,
      },
    );
  typia.assert(labIntegration);

  // 3-1. Search with valid organizationId & labIntegrationId (should get only correct records)
  const filtered =
    await api.functional.healthcarePlatform.organizationAdmin.labResultImports.index(
      connection,
      {
        body: {
          organizationId: labIntegration.healthcare_platform_organization_id,
          labIntegrationId: labIntegration.id,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformLabResultImport.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "should return only records for correct org/integration (or empty if none exist)",
    filtered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "every result matches org/integration filter",
    filtered.data.every(
      (record) =>
        record.healthcare_platform_organization_id ===
          labIntegration.healthcare_platform_organization_id &&
        record.lab_integration_id === labIntegration.id,
    ),
  );

  // 3-2. Search with wrong labIntegrationId: expect empty result
  const fakeLabIntegrationId = typia.random<string & tags.Format<"uuid">>();
  const resFakeIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labResultImports.index(
      connection,
      {
        body: {
          organizationId: labIntegration.healthcare_platform_organization_id,
          labIntegrationId: fakeLabIntegrationId,
          page: 1,
          pageSize: 5,
        } satisfies IHealthcarePlatformLabResultImport.IRequest,
      },
    );
  typia.assert(resFakeIntegration);
  TestValidator.equals(
    "should return 0 results for wrong labIntegrationId",
    resFakeIntegration.data.length,
    0,
  );

  // 3-3. Search with wrong organizationId: expect empty
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  const resFakeOrg =
    await api.functional.healthcarePlatform.organizationAdmin.labResultImports.index(
      connection,
      {
        body: {
          organizationId: fakeOrgId,
          labIntegrationId: labIntegration.id,
          page: 1,
          pageSize: 5,
        } satisfies IHealthcarePlatformLabResultImport.IRequest,
      },
    );
  typia.assert(resFakeOrg);
  TestValidator.equals(
    "should return 0 results for wrong organizationId",
    resFakeOrg.data.length,
    0,
  );

  // 3-4. Search with no filters (should return paginated data)
  const noFilter =
    await api.functional.healthcarePlatform.organizationAdmin.labResultImports.index(
      connection,
      {
        body: {
          page: 1,
          pageSize: 5,
        } satisfies IHealthcarePlatformLabResultImport.IRequest,
      },
    );
  typia.assert(noFilter);
  TestValidator.equals(
    "should have page=1 for no-filter search",
    noFilter.pagination.current,
    1,
  );

  // 3-5. Attempt search with unauthenticated context (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access import search",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labResultImports.index(
        unauthConn,
        {
          body: {
            organizationId: labIntegration.healthcare_platform_organization_id,
            labIntegrationId: labIntegration.id,
            page: 1,
            pageSize: 2,
          } satisfies IHealthcarePlatformLabResultImport.IRequest,
        },
      );
    },
  );
}
