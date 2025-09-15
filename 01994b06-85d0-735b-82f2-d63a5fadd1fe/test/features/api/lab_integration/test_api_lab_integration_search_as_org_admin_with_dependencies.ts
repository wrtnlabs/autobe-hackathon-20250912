import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabIntegration";

/**
 * Validate searching and paginating lab integration connectors as an
 * organization admin (organizationAdmin).
 *
 * This test covers:
 *
 * - End-to-end workflow from multi-admin/system admin authentication and
 *   organization setup
 * - Registration of organization and assignment of org admin
 * - Creation of multiple lab integration connectors for the organization
 * - PATCH search for connectors filtered by organization_id, lab_vendor_code,
 *   and pagination
 * - Validation that admin can only see their organization's connectors
 * - Edge cases: no connectors, search for invalid org, oversized pages,
 *   filters with no results, permission boundaries
 *
 * Steps:
 *
 * 1. Register and login as systemAdmin
 * 2. Create a new organization as systemAdmin
 * 3. Register and login as organizationAdmin (org admin account)
 * 4. (Ensure assignment to org if business logic would allow)
 * 5. As orgAdmin, create multiple lab integration connectors for their
 *    organization
 * 6. PATCH: As orgAdmin, search lab integrations with various filters (org_id,
 *    lab_vendor_code, pagination)
 * 7. Assert only this organization's connectors are returned, and filters take
 *    effect (e.g., by vendor code)
 * 8. Assert page structure (IPage) and pagination fields are present and
 *    logical; try edge case of page_size larger than connectors
 * 9. Search by invalid/nonexistent organization id; expect empty result
 * 10. Search by a filter that yields zero results
 * 11. (Optional) Validate orgAdmin cannot see integrations from another org (if
 *     relevant)
 * 12. (Optional) Review response for audit logging markers if present in API
 *     structure
 */
export async function test_api_lab_integration_search_as_org_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register and login as systemAdmin
  const sysadmEmail = typia.random<string & tags.Format<"email">>();
  const sysadm = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadmEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysadmEmail,
      password: "Sys@dmin1234",
    },
  });
  typia.assert(sysadm);

  // 2. Create a new organization as systemAdmin
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgCreate = {
    code: orgCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgCreate,
      },
    );
  typia.assert(org);

  // 3. Register and login as organizationAdmin
  const orgadmEmail = typia.random<string & tags.Format<"email">>();
  const orgadmJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgadmEmail,
        full_name: RandomGenerator.name(),
        password: "Org@dmin4567",
      },
    },
  );
  typia.assert(orgadmJoin);

  // (Depending on platform, business logic may require explicit assignment of this org admin to the org; omitted as assignment API not provided.)

  // Login as organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmEmail,
      password: "Org@dmin4567",
    },
  });

  // 5. Create multiple lab integration connectors for this org
  const vendorCodes = ["LabCorp", "Quest", "AcmeLab"] as const;
  const createdLabIntegrations: IHealthcarePlatformLabIntegration[] =
    await ArrayUtil.asyncMap(vendorCodes, async (vendor) => {
      const createLabIntegration = {
        healthcare_platform_organization_id: org.id,
        lab_vendor_code: vendor,
        connection_uri: `https://api.${vendor.toLowerCase()}.com/v1/lab-integration/${RandomGenerator.alphaNumeric(12)}`,
        supported_message_format: "HL7 V2",
        status: "active",
      } satisfies IHealthcarePlatformLabIntegration.ICreate;
      const labIntegration =
        await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
          connection,
          {
            body: createLabIntegration,
          },
        );
      typia.assert(labIntegration);
      return labIntegration;
    });

  // 6. PATCH - as orgAdmin, search for lab integrations by organization ID only
  const resultByOrg =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(resultByOrg);
  TestValidator.predicate(
    "all integrations belong to this org",
    resultByOrg.data.every(
      (d) => d.healthcare_platform_organization_id === org.id,
    ),
  );
  TestValidator.equals(
    "total records matches number created",
    resultByOrg.pagination.records,
    createdLabIntegrations.length,
  );

  // 7. PATCH - search by lab_vendor_code
  const filterVendor = vendorCodes[1];
  const resultByVendor =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          lab_vendor_code: filterVendor,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(resultByVendor);
  TestValidator.predicate(
    `returned integrations all match vendor ${filterVendor}`,
    resultByVendor.data.every((d) => d.lab_vendor_code === filterVendor),
  );

  // 8. Check pagination (oversize page_size)
  const resultPageOversize =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 1000 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(resultPageOversize);
  TestValidator.predicate(
    "all integrations are returned when page_size > total",
    resultPageOversize.data.length === createdLabIntegrations.length,
  );
  TestValidator.equals(
    "pagination current is 1",
    resultPageOversize.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    resultPageOversize.pagination.pages >= 1,
  );

  // 9. Search for connectors with a non-existent organization id
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  const resultFakeOrg =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: fakeOrgId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(resultFakeOrg);
  TestValidator.equals(
    "no integrations for non-existent org",
    resultFakeOrg.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records is 0",
    resultFakeOrg.pagination.records,
    0,
  );

  // 10. Search for connectors with filter that yields no results
  const invalidVendor = "NonExistentVendor";
  const resultNoResults =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          lab_vendor_code: invalidVendor,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(resultNoResults);
  TestValidator.equals(
    "no integrations for invalid vendor filter",
    resultNoResults.data.length,
    0,
  );

  // 11. (Optional) Negative permission check: ensure orgAdmin does not see another org's integrations
  // Create a second org as sys admin
  const org2Code = RandomGenerator.alphaNumeric(8);
  const org2Create = {
    code: org2Code,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: org2Create,
      },
    );
  typia.assert(org2);

  // Create an integration for the second org
  await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
    connection,
    {
      body: {
        healthcare_platform_organization_id: org2.id,
        lab_vendor_code: "LabCorp",
        connection_uri: `https://api.labcorp.com/v1/lab-integration/${RandomGenerator.alphaNumeric(12)}`,
        supported_message_format: "HL7 V2",
        status: "active",
      },
    },
  );

  // Search for org2's integrations as org1's admin
  const forbiddenResult =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org2.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(forbiddenResult);
  TestValidator.equals(
    "orgAdmin cannot see other org's integrations",
    forbiddenResult.data.length,
    0,
  );
}
