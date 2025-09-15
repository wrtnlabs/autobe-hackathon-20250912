import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessments";

export async function test_api_organizationadmin_assessment_search_with_tenant_scope_and_pagination(
  connection: api.IConnection,
) {
  // 1. Organization admin user signs up
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const email: string = RandomGenerator.alphaNumeric(8) + "@example.com";
  const password = "Password123!";

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminUser =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(organizationAdminUser);

  // 2. The user logs in
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInUser = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInUser);

  // 3. Perform successful assessment search with tenant_id
  const searchBaseBody = {
    tenant_id: tenantId,
    page: 1,
    limit: 10,
  } satisfies IEnterpriseLmsAssessments.IRequest;

  // Basic tenant-filtered search
  const searchResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.index(
      connection,
      {
        body: searchBaseBody,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "All data tenant_id matches search tenant_id",
    searchResult.data.every((assessment) => assessment.tenant_id === tenantId),
  );

  TestValidator.predicate(
    "Pagination info has correct current page",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination info has correct limit",
    searchResult.pagination.limit === 10,
  );

  // 4. Test pagination page 2, limit 5
  const page2Body = {
    tenant_id: tenantId,
    page: 2,
    limit: 5,
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const page2Result =
    await api.functional.enterpriseLms.organizationAdmin.assessments.index(
      connection,
      {
        body: page2Body,
      },
    );
  typia.assert(page2Result);

  TestValidator.predicate(
    "Pagination current page is 2",
    page2Result.pagination.current === 2,
  );
  TestValidator.predicate(
    "Pagination limit is 5",
    page2Result.pagination.limit === 5,
  );

  // 5. Test orderBy and orderDirection
  // Sort by code ascending
  const orderByCodeAscBody = {
    tenant_id: tenantId,
    page: 1,
    limit: 10,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const orderByCodeAscResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.index(
      connection,
      {
        body: orderByCodeAscBody,
      },
    );
  typia.assert(orderByCodeAscResult);

  // Verify sorted ascending by code
  TestValidator.predicate(
    "Assessments sorted ascending by code",
    orderByCodeAscResult.data.every(
      (assessment, i, arr) =>
        i === 0 || arr[i - 1].code.localeCompare(assessment.code) <= 0,
    ),
  );

  // Sort by title descending
  const orderByTitleDescBody = {
    tenant_id: tenantId,
    page: 1,
    limit: 10,
    orderBy: "title",
    orderDirection: "desc",
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const orderByTitleDescResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.index(
      connection,
      {
        body: orderByTitleDescBody,
      },
    );
  typia.assert(orderByTitleDescResult);

  // Verify sorted descending by title
  TestValidator.predicate(
    "Assessments sorted descending by title",
    orderByTitleDescResult.data.every(
      (assessment, i, arr) =>
        i === 0 || arr[i - 1].title.localeCompare(assessment.title) >= 0,
    ),
  );

  // 6. Test search with filters
  const filterBody = {
    tenant_id: tenantId,
    page: 1,
    limit: 10,
    code:
      orderByCodeAscResult.data.length > 0
        ? orderByCodeAscResult.data[0].code
        : undefined,
    title:
      orderByTitleDescResult.data.length > 0
        ? orderByTitleDescResult.data[0].title
        : undefined,
    assessment_type:
      orderByCodeAscResult.data.length > 0
        ? orderByCodeAscResult.data[0].assessment_type
        : undefined,
    status:
      orderByTitleDescResult.data.length > 0
        ? orderByTitleDescResult.data[0].status
        : undefined,
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const filterResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.index(
      connection,
      {
        body: filterBody,
      },
    );
  typia.assert(filterResult);

  // All data should match tenant and, if filters are set, match the filters
  TestValidator.predicate(
    "All data has tenant_id matching",
    filterResult.data.every((a) => a.tenant_id === tenantId),
  );
  if (filterBody.code !== undefined)
    TestValidator.predicate(
      "All data has code includes filter",
      filterResult.data.every((a) => a.code.includes(filterBody.code!)),
    );
  if (filterBody.title !== undefined)
    TestValidator.predicate(
      "All data has title includes filter",
      filterResult.data.every((a) => a.title.includes(filterBody.title!)),
    );
  if (filterBody.assessment_type !== undefined)
    TestValidator.predicate(
      "All data has assessment_type matching filter",
      filterResult.data.every(
        (a) => a.assessment_type === filterBody.assessment_type,
      ),
    );
  if (filterBody.status !== undefined)
    TestValidator.predicate(
      "All data has status matching filter",
      filterResult.data.every((a) => a.status === filterBody.status),
    );

  // 7. Test missing tenant_id triggers error
  await TestValidator.error(
    "Search without tenant_id should throw error",
    async () => {
      const bodyWithoutTenantId = {
        page: 1,
        limit: 10,
      } satisfies Omit<IEnterpriseLmsAssessments.IRequest, "tenant_id">;
      await api.functional.enterpriseLms.organizationAdmin.assessments.index(
        connection,
        {
          body: bodyWithoutTenantId as unknown as IEnterpriseLmsAssessments.IRequest,
        },
      );
    },
  );

  // 8. Test unauthorized search
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Search without authentication should throw error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.index(
        unauthenticatedConnection,
        {
          body: searchBaseBody,
        },
      );
    },
  );
}
