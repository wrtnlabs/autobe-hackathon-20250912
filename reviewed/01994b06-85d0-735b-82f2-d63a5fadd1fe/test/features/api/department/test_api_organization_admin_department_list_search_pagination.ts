import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDepartment";

/**
 * E2E business workflow: list/search/paginate departments as organization
 * admin.
 *
 * 1. Register and log in a system admin to create orgs.
 * 2. Register and log in an organization admin (capture credentials for
 *    switching roles).
 * 3. As system admin, create a new organization (unique code and name).
 * 4. (If required) Organization admin is now associated with org context.
 * 5. As org admin, create multiple department records in the organization
 *    (unique & some common names for search).
 * 6. List all departments for the org; validate pagination, bounds, and all
 *    created depts appear.
 * 7. Search by name/code/status; validate result matches created data, no
 *    spurious records.
 * 8. Test pagination edge (page size 2, iterate over all pages, results
 *    consistent).
 * 9. Try listing/searching departments with invalid org ID as org admin;
 *    assert error is thrown (not found/forbidden, should fail gracefully).
 */
export async function test_api_organization_admin_department_list_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register and log in a system admin
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysPassword = "SysAdmin!1234";
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysEmail,
      password: sysPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // 2. Register and log in organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "OrgAdmin!5678";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 3. As system admin, log back in case of context switch & create organization
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      provider: "local",
      provider_key: sysEmail,
      password: sysPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const orgCode = RandomGenerator.alphaNumeric(5);
  const orgName = RandomGenerator.paragraph({ sentences: 2 });
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  TestValidator.equals("organization code matches", organization.code, orgCode);

  // 4. Switch to organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Create multiple departments (some with common substrings for search).
  const departmentSeeds = [
    { code: "CARD", name: "Cardiology", status: "active" },
    { code: "RAD", name: "Radiology", status: "active" },
    { code: "BILL", name: "Billing", status: "archived" },
    { code: "NEURO", name: "Neuroscience", status: "pending" },
    { code: "ADMIN", name: "Administration", status: "active" },
    { code: "CUSTOM", name: "CustomDept", status: "active" },
  ];
  const departments: IHealthcarePlatformDepartment[] = [];
  for (const seed of departmentSeeds) {
    const dept =
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
        connection,
        {
          organizationId: organization.id,
          body: {
            healthcare_platform_organization_id: organization.id,
            code: seed.code,
            name: seed.name,
            status: seed.status,
          } satisfies IHealthcarePlatformDepartment.ICreate,
        },
      );
    typia.assert(dept);
    departments.push(dept);
  }

  // 6. List all departments - default retrieval, should get all
  const listAll =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.index(
      connection,
      {
        organizationId: organization.id,
        body: {},
      },
    );
  typia.assert(listAll);
  TestValidator.predicate(
    "all departments created appear in list",
    departmentSeeds.every((seed) =>
      listAll.data.some(
        (d) =>
          d.code === seed.code &&
          d.name === seed.name &&
          d.status === seed.status,
      ),
    ),
  );
  TestValidator.equals(
    "pagination record count matches",
    listAll.pagination.records,
    departmentSeeds.length,
  );

  // 7. Search by code
  const searchCode = departmentSeeds[0].code;
  const listByCode =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.index(
      connection,
      {
        organizationId: organization.id,
        body: { code: searchCode },
      },
    );
  typia.assert(listByCode);
  TestValidator.predicate(
    "search by code returns only relevant department",
    listByCode.data.every((d) => d.code === searchCode),
  );

  // 8. Search by name (partial - substrings possible depending on backend logic)
  const nameQuery = "Radi";
  const listByName =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.index(
      connection,
      {
        organizationId: organization.id,
        body: { name: nameQuery },
      },
    );
  typia.assert(listByName);
  TestValidator.predicate(
    "search by partial name returns expected departments",
    listByName.data.every((d) => d.name.includes(nameQuery)),
  );

  // 9. Search by status
  const statusSearch = "active";
  const listByStatus =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.index(
      connection,
      {
        organizationId: organization.id,
        body: { status: statusSearch },
      },
    );
  typia.assert(listByStatus);
  TestValidator.predicate(
    "departments list by status matches search status",
    listByStatus.data.every((d) => d.status === statusSearch),
  );
  TestValidator.predicate(
    "at least one department is returned for active status",
    listByStatus.data.length > 0,
  );

  // 10. Pagination: Page size 2, iterate pages
  const pageSize = 2;
  let accumulatedIds: string[] = [];
  let totalPages: number | undefined;
  for (let currentPage = 0; ; ++currentPage) {
    const pageRes =
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.index(
        connection,
        {
          organizationId: organization.id,
          body: { limit: pageSize, page: currentPage },
        },
      );
    typia.assert(pageRes);
    if (totalPages === undefined) totalPages = pageRes.pagination.pages;
    if (pageRes.data.length === 0) break;
    accumulatedIds.push(...pageRes.data.map((d) => d.id));
    if (currentPage + 1 >= totalPages) break;
  }
  TestValidator.equals(
    "paginated department IDs cover all created",
    departments.map((d) => d.id).sort(),
    accumulatedIds.sort(),
  );

  // 11. Negative test: invalid org id returns an error
  const invalidOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "listing/searching departments with invalid org id fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.index(
        connection,
        {
          organizationId: invalidOrgId,
          body: {},
        },
      );
    },
  );
}
