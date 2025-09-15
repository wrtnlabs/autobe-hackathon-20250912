import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsDepartmentmanager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsDepartmentmanager";

/**
 * Validate the department manager listing API with full authentication and
 * filtering.
 *
 * This test function follows a full workflow for managing department
 * managers in an enterprise LMS system. Starting with creation and
 * authentication of an organization admin user, it proceeds to create
 * multiple department manager users under the same tenant context. After
 * setting up the users with authenticated sessions, it performs various
 * filtering and pagination operations against the department manager
 * listing API. The test validates correct filtering by tenant, status,
 * search keywords, and orders sorting while verifying pagination metadata
 * accuracy. The test also performs negative tests for unauthorized access
 * and invalid pagination values. It ensures correct enforcement of
 * multi-tenant separation and access control.
 *
 * @param connection - API connection context
 */
export async function test_api_department_manager_list_with_authentication_and_filtering(
  connection: api.IConnection,
) {
  // 1. Create Organization Admin user via join
  const organizationAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `admin.${RandomGenerator.alphaNumeric(8)}@enterprise.com`,
    password: "SecurePass123!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBody,
    });
  typia.assert(organizationAdmin);

  // 2. Login as Organization Admin
  const organizationAdminLoginBody = {
    email: organizationAdminCreateBody.email,
    password: organizationAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const organizationAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: organizationAdminLoginBody,
    });
  typia.assert(organizationAdminLogin);

  // 3. Create multiple Department Manager users under the same tenant
  const departmentManagers: IEnterpriseLmsDepartmentManager.IAuthorized[] = [];
  const departmentManagerPlainPasswords: string[] = [];
  const departmentManagerCount = 3;

  for (let i = 0; i < departmentManagerCount; i++) {
    const password = `DeptManPass${RandomGenerator.alphaNumeric(5)}`;

    const deptManagerCreateBody = {
      email: `deptmngr${RandomGenerator.alphaNumeric(6)}@enterprise.com`,
      password: password,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
    } satisfies IEnterpriseLmsDepartmentManager.ICreate;

    // Create department manager user
    const deptManager: IEnterpriseLmsDepartmentManager.IAuthorized =
      await api.functional.auth.departmentManager.join(connection, {
        body: deptManagerCreateBody,
      });
    typia.assert(deptManager);

    departmentManagers.push(deptManager);
    departmentManagerPlainPasswords.push(password);
  }

  // 4. Optionally login as each Department Manager to ensure authentication
  for (let i = 0; i < departmentManagerCount; i++) {
    const deptManagerLoginBody = {
      email: departmentManagers[i].email,
      password: departmentManagerPlainPasswords[i],
    } satisfies IEnterpriseLmsDepartmentManager.ILogin;

    const deptManagerLogin: IEnterpriseLmsDepartmentManager.IAuthorized =
      await api.functional.auth.departmentManager.login(connection, {
        body: deptManagerLoginBody,
      });
    typia.assert(deptManagerLogin);
  }

  // 5. Test filtering and pagination of department managers
  //    - Various filters: tenant_id, status, search keyword
  //    - Pagination limits and page numbers
  //    - Sort by first_name ascending

  // Prepare common filtering body
  const baseRequest: IEnterpriseLmsDepartmentManager.IRequest = {
    page: 1,
    limit: 10,
    status: null, // no status filter
    search: null, // no search filter
    order: "+first_name",
  };

  // 5.1 Test basic listing with default filters
  const listResponse1: IPageIEnterpriseLmsDepartmentmanager.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
      connection,
      {
        body: {
          ...baseRequest,
          // No filtering, default page and limit, ordering by first_name asc
        },
      },
    );
  typia.assert(listResponse1);

  // All department managers should belong to the tenant of the organization admin
  for (const dm of listResponse1.data) {
    TestValidator.equals(
      "tenant_id matches organization admin tenant",
      dm.tenant_id,
      organizationAdmin.tenant_id,
    );
  }

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    listResponse1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    listResponse1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    listResponse1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    listResponse1.pagination.pages >= 0,
  );

  // Validate ordering by first_name ascending
  for (let i = 1; i < listResponse1.data.length; i++) {
    const prev = listResponse1.data[i - 1].first_name;
    const curr = listResponse1.data[i].first_name;
    TestValidator.predicate(
      "first_name ascending order",
      prev.localeCompare(curr) <= 0,
    );
  }

  // 5.2 Test filtering by status (non empty)
  // Find one status from returned data or fallback to "active"
  let testStatus: string | null = null;
  if (listResponse1.data.length > 0) {
    testStatus = listResponse1.data[0].status;
  } else {
    testStatus = "active"; // fallback
  }

  const listResponse2: IPageIEnterpriseLmsDepartmentmanager.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
      connection,
      {
        body: {
          ...baseRequest,
          status: testStatus,
        },
      },
    );
  typia.assert(listResponse2);

  for (const dm of listResponse2.data) {
    TestValidator.equals("status filter matches", dm.status, testStatus);
  }

  // 5.3 Test filtering by search keyword on first_name
  if (listResponse1.data.length > 0) {
    const searchFirstName = listResponse1.data[0].first_name.substring(0, 2);

    const listResponse3: IPageIEnterpriseLmsDepartmentmanager.ISummary =
      await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
        connection,
        {
          body: {
            ...baseRequest,
            search: searchFirstName,
          },
        },
      );
    typia.assert(listResponse3);

    for (const dm of listResponse3.data) {
      TestValidator.predicate(
        "search keyword found in first_name or last_name",
        dm.first_name.includes(searchFirstName) ||
          dm.last_name.includes(searchFirstName),
      );
    }
  }

  // 5.4 Test pagination limits boundaries
  const listResponse4: IPageIEnterpriseLmsDepartmentmanager.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
      connection,
      {
        body: {
          ...baseRequest,
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(listResponse4);
  TestValidator.predicate(
    "valid pagination data",
    listResponse4.pagination.limit === 1,
  );

  // 5.5 Test invalid page input - page 0 should be treated logically,
  //     server may reset to page 1 or return empty
  const listResponse5: IPageIEnterpriseLmsDepartmentmanager.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
      connection,
      {
        body: {
          ...baseRequest,
          limit: 1,
          page: 0, // invalid input
        },
      },
    );
  typia.assert(listResponse5);
  TestValidator.predicate(
    "invalid page input handled",
    listResponse5.pagination.current === 1 ||
      listResponse5.pagination.current === 0,
  );

  // 5.6 Test invalid limit input - zero limit
  await TestValidator.error("invalid limit value should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
      connection,
      {
        body: {
          ...baseRequest,
          limit: 0, // invalid limit
          page: 1,
        },
      },
    );
  });

  // 6. Negative testing - unauthorized access
  // Create a new connection without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized request fails", async () => {
    await api.functional.enterpriseLms.organizationAdmin.departmentmanagers.index(
      unauthenticatedConnection,
      {
        body: baseRequest,
      },
    );
  });
}
