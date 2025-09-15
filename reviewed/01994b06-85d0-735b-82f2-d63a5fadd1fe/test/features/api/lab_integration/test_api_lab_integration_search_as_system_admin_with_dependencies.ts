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
 * Validate lab integration search and pagination as systemAdmin.
 *
 * 1. Register/authenticate as systemAdmin
 * 2. Create a new organization
 * 3. Register/authenticate as organizationAdmin
 * 4. As organizationAdmin, create multiple lab integrations for org
 * 5. Switch back to systemAdmin
 * 6. Search for org's integrations by organization_id (should return all)
 * 7. Search with non-existent org_id (should return zero)
 * 8. Check pagination by page size and page number
 * 9. Filter by status/vendor code - results match
 * 10. Excessive page number returns empty
 * 11. All accesses succeed and all audit outcomes are consistent
 */
export async function test_api_lab_integration_search_as_system_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);
  // Explicit login (tests login endpoint works)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Register a new organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);

  // 3. Register & login as organizationAdmin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create multiple lab integrations for this org as org admin
  const NUM_INTEGRATIONS = 5;
  const vendorCodes = [
    "LabCorp",
    "Quest",
    "BioRef",
    "MayoClinic",
    "OtherLab",
  ] as const;
  const statuses = ["active", "pending", "disabled"] as const;
  const labIntegrations: IHealthcarePlatformLabIntegration[] = [];
  for (let i = 0; i < NUM_INTEGRATIONS; ++i) {
    const lab =
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            lab_vendor_code: vendorCodes[i % vendorCodes.length],
            connection_uri: `https://integration${i + 1}.labs.example.org/api`,
            supported_message_format: RandomGenerator.pick([
              "HL7 V2",
              "FHIR R4",
              "C-CDA",
            ] as const),
            status: RandomGenerator.pick(statuses),
          } satisfies IHealthcarePlatformLabIntegration.ICreate,
        },
      );
    labIntegrations.push(lab);
    typia.assert(lab);
  }

  // 5. Switch back to systemAdmin (for search access)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 6. Search for org's integrations by organization_id
  const searchResOrg =
    await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          page: 1,
          page_size: 10,
        } satisfies IHealthcarePlatformLabIntegration.IRequest,
      },
    );
  typia.assert(searchResOrg);
  // Validate all returned records belong to correct org
  for (const record of searchResOrg.data) {
    TestValidator.equals(
      "record belongs to org",
      record.healthcare_platform_organization_id,
      organization.id,
    );
  }
  TestValidator.equals(
    "total integrations",
    searchResOrg.data.length,
    NUM_INTEGRATIONS,
  );

  // 7. Search with non-existent org_id (should be empty)
  const missingOrgId = typia.random<string & tags.Format<"uuid">>();
  const emptyRes =
    await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: missingOrgId,
          page: 1,
          page_size: 10,
        },
      },
    );
  typia.assert(emptyRes);
  TestValidator.equals(
    "empty result on missing org_id",
    emptyRes.data.length,
    0,
  );

  // 8. Pagination (request single page)
  const searchPage1 =
    await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          page: 1,
          page_size: 2,
        } satisfies IHealthcarePlatformLabIntegration.IRequest,
      },
    );
  typia.assert(searchPage1);
  TestValidator.equals("first page size", searchPage1.data.length, 2);
  // fetch page 2
  const searchPage2 =
    await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          page: 2,
          page_size: 2,
        } satisfies IHealthcarePlatformLabIntegration.IRequest,
      },
    );
  typia.assert(searchPage2);
  TestValidator.equals("second page size", searchPage2.data.length, 2);

  // 9. Filter by status and vendor
  for (const status of statuses) {
    const filterRes =
      await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            status,
            page: 1,
            page_size: 10,
          } satisfies IHealthcarePlatformLabIntegration.IRequest,
        },
      );
    typia.assert(filterRes);
    for (const record of filterRes.data) {
      TestValidator.equals("status filter", record.status, status);
    }
  }
  for (const vendor of vendorCodes) {
    const vendorRes =
      await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            lab_vendor_code: vendor,
            page: 1,
            page_size: 10,
          } satisfies IHealthcarePlatformLabIntegration.IRequest,
        },
      );
    typia.assert(vendorRes);
    for (const rec of vendorRes.data) {
      TestValidator.equals("vendor code filter", rec.lab_vendor_code, vendor);
    }
  }

  // 10. Excessive page number returns empty
  const tooHighPage =
    await api.functional.healthcarePlatform.systemAdmin.labIntegrations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          page: 99,
          page_size: 10,
        } satisfies IHealthcarePlatformLabIntegration.IRequest,
      },
    );
  typia.assert(tooHighPage);
  TestValidator.equals(
    "empty page for too-high page",
    tooHighPage.data.length,
    0,
  );
}
