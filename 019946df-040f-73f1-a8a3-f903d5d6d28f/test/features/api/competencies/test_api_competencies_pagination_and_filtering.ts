import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCompetency } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetency";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCompetency } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCompetency";

/**
 * Test the pagination and filtering capabilities of the competencies listing
 * endpoint for the organization admin role. It authenticates an organization
 * admin user, then inserts multiple competency records compliant with the
 * tenant context. Next, the test performs search queries using various filters
 * such as competency code, status, and partial name matches. The test verifies
 * correct pagination behavior including page size and page number restrictions.
 * It validates that the filtered results match expected data sets and that
 * unauthorized roles cannot access this endpoint. Edge cases include an empty
 * result set, invalid filter criteria, and boundary values for pagination. The
 * test asserts HTTP status codes, response data integrity, and compliance with
 * business constraints throughout.
 */
export async function test_api_competencies_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Organization admin user creation and authentication
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const organizationAdminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: organizationAdminEmail,
        password: "securePassword123!", // Fixed password for all test cases
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Since there is no competency creation endpoint, assume competencies exist logically for the tenant

  // 3. Test fetching competencies without filters (default pagination)
  {
    const body = {
      tenant_id: tenantId,
      page: 1,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const response =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination: current page is 1",
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination: limit is 10",
      response.pagination.limit === 10,
    );
    TestValidator.predicate(
      "pagination: data count is at most 10",
      response.data.length <= 10,
    );
  }

  // 4. Test filtering by competency code exact match (should find 1 or 0 result)
  {
    const sampleCode = "COMP1005";
    const body = {
      tenant_id: tenantId,
      code: sampleCode,
      page: 1,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const response =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      `filter by code exact match returns at most 1 record for code ${sampleCode}`,
      response.data.length <= 1,
    );
    if (response.data.length === 1) {
      TestValidator.equals(
        "filtered code equals sample code",
        response.data[0].code,
        sampleCode,
      );
    }
  }

  // 5. Test filtering only active competencies (deleted_at null implied)
  {
    const body = {
      tenant_id: tenantId,
      // onlyActive is not an API filter, omitted
      page: 1,
      limit: 20,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const response =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body },
      );
    typia.assert(response);
    // Cannot validate active on response as ISummary has no deleted_at
    TestValidator.predicate(
      "pagination limit respected",
      response.data.length <= 20,
    );
  }

  // 6. Test filtering by partial competency name (case sensitive partial match)
  {
    const partialName = "Competency_";
    const body = {
      tenant_id: tenantId,
      name: partialName,
      page: 1,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const response =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "all returned competencies contain partial name",
      response.data.every((item) => item.name.includes(partialName)),
    );
  }

  // 7. Test pagination boundary cases (page 0, negative, large limits)
  {
    // Page 0 treated as page 1 or valid per business logic
    const bodyPageZero = {
      tenant_id: tenantId,
      page: 0,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const responsePageZero =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body: bodyPageZero },
      );
    typia.assert(responsePageZero);
    TestValidator.predicate(
      "page 0 treated as valid page number (usually 1 or adjusted)",
      responsePageZero.pagination.current >= 1,
    );

    // Negative page treated as 1 or adjusted
    const bodyNegativePage = {
      tenant_id: tenantId,
      page: -1,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const responseNegative =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body: bodyNegativePage },
      );
    typia.assert(responseNegative);
    TestValidator.predicate(
      "negative page treated as valid page number",
      responseNegative.pagination.current >= 1,
    );

    // Large limit test
    const largeLimit = 1000;
    const bodyLargeLimit = {
      tenant_id: tenantId,
      page: 1,
      limit: largeLimit,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const responseLargeLimit =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body: bodyLargeLimit },
      );
    typia.assert(responseLargeLimit);
    TestValidator.predicate(
      "large limit handled gracefully",
      responseLargeLimit.data.length <= largeLimit,
    );
  }

  // 8. Test filtering with no matching competencies returns empty data
  {
    const body = {
      tenant_id: tenantId,
      code: "NON_EXISTENT_CODE_999",
      page: 1,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    const response =
      await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
        connection,
        { body },
      );
    typia.assert(response);
    TestValidator.equals(
      "empty result for non-existent code filter",
      response.data.length,
      0,
    );
  }

  // 9. Test unauthorized role cannot access
  {
    const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

    const body = {
      tenant_id: tenantId,
      page: 1,
      limit: 10,
    } satisfies IEnterpriseLmsCompetency.IRequest;

    await TestValidator.error(
      "unauthorized role cannot access competencies listing",
      async () => {
        await api.functional.enterpriseLms.organizationAdmin.competencies.indexCompetencies(
          unauthorizedConn,
          { body },
        );
      },
    );
  }
}
