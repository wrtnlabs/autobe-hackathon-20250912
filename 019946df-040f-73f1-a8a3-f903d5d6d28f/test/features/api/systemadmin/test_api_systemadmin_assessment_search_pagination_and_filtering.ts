import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessments";

/**
 * End-to-end test for systemAdmin assessment search with pagination,
 * filtering, and sorting.
 *
 * Validates full lifecycle from systemAdmin user creation, login, to robust
 * assessment search.
 *
 * Steps:
 *
 * 1. Create systemAdmin with valid data via join endpoint
 * 2. Authenticate systemAdmin and retrieve token via login endpoint
 * 3. Use authenticated context to perform patch search requests on assessments
 * 4. Verify pagination correctness including pages, records, limit, current
 * 5. Validate filtering by tenant_id, code snippet, title snippet, status
 * 6. Test sorting by title ascending and descending
 * 7. Confirm empty and invalid filter result scenarios
 * 8. Check that unauthorized access attempts return errors
 *
 * Uses typia.assert for response validation and TestValidator for business
 * logic assertions.
 */
export async function test_api_systemadmin_assessment_search_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Create a new systemAdmin user
  const systemAdminCreateBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(24),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const createdAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(createdAdmin);

  // 2. Login as the created systemAdmin
  const systemAdminLoginBody = {
    email: createdAdmin.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Prepare base request for search
  const baseSearchRequest = {
    tenant_id: createdAdmin.tenant_id,
    page: 1,
    limit: 10,
  } satisfies IEnterpriseLmsAssessments.IRequest;

  // 4. Test basic search with no filters
  const baseSearchResult: IPageIEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.index(
      connection,
      { body: baseSearchRequest },
    );
  typia.assert(baseSearchResult);
  TestValidator.predicate(
    "pagination limit is positive",
    baseSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    baseSearchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    baseSearchResult.pagination.pages > 0 ||
      baseSearchResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    baseSearchResult.pagination.records >= 0,
  );

  // 5. Test filtering by code snippet
  if (baseSearchResult.data.length > 0) {
    const testCodeSnippet = baseSearchResult.data[0].code.substring(0, 3);
    const codeFilterRequest = {
      ...baseSearchRequest,
      code: testCodeSnippet,
    } satisfies IEnterpriseLmsAssessments.IRequest;

    const filteredByCode: IPageIEnterpriseLmsAssessments =
      await api.functional.enterpriseLms.systemAdmin.assessments.index(
        connection,
        { body: codeFilterRequest },
      );
    typia.assert(filteredByCode);
    TestValidator.predicate(
      "all code filtered entries include code snippet",
      filteredByCode.data.every((assessment) =>
        assessment.code.includes(testCodeSnippet),
      ),
    );
  }

  // 6. Test filtering by title snippet
  if (baseSearchResult.data.length > 0) {
    const testTitleSnippet = baseSearchResult.data[0].title.substring(0, 4);
    const titleFilterRequest = {
      ...baseSearchRequest,
      title: testTitleSnippet,
    } satisfies IEnterpriseLmsAssessments.IRequest;

    const filteredByTitle: IPageIEnterpriseLmsAssessments =
      await api.functional.enterpriseLms.systemAdmin.assessments.index(
        connection,
        { body: titleFilterRequest },
      );
    typia.assert(filteredByTitle);
    TestValidator.predicate(
      "all title filtered entries include title snippet",
      filteredByTitle.data.every((assessment) =>
        assessment.title.includes(testTitleSnippet),
      ),
    );
  }

  // 7. Test filtering by status
  if (baseSearchResult.data.length > 0) {
    const testStatus = baseSearchResult.data[0].status;
    const statusFilterRequest = {
      ...baseSearchRequest,
      status: testStatus,
    } satisfies IEnterpriseLmsAssessments.IRequest;

    const filteredByStatus: IPageIEnterpriseLmsAssessments =
      await api.functional.enterpriseLms.systemAdmin.assessments.index(
        connection,
        { body: statusFilterRequest },
      );
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      `all status filtered entries have status ${testStatus}`,
      filteredByStatus.data.every(
        (assessment) => assessment.status === testStatus,
      ),
    );
  }

  // 8. Test sorting by title ascending
  const sortAscRequest = {
    ...baseSearchRequest,
    orderBy: "title",
    orderDirection: "asc",
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const sortedAscResult: IPageIEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.index(
      connection,
      { body: sortAscRequest },
    );
  typia.assert(sortedAscResult);
  for (let i = 1; i < sortedAscResult.data.length; i++) {
    TestValidator.predicate(
      "title is sorted ascending",
      sortedAscResult.data[i - 1].title.localeCompare(
        sortedAscResult.data[i].title,
      ) <= 0,
    );
  }

  // 9. Test sorting by title descending
  const sortDescRequest = {
    ...baseSearchRequest,
    orderBy: "title",
    orderDirection: "desc",
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const sortedDescResult: IPageIEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.index(
      connection,
      { body: sortDescRequest },
    );
  typia.assert(sortedDescResult);
  for (let i = 1; i < sortedDescResult.data.length; i++) {
    TestValidator.predicate(
      "title is sorted descending",
      sortedDescResult.data[i - 1].title.localeCompare(
        sortedDescResult.data[i].title,
      ) >= 0,
    );
  }

  // 10. Test empty filter result
  const emptyFilterRequest = {
    ...baseSearchRequest,
    code: "NONEXISTENTCODE",
  } satisfies IEnterpriseLmsAssessments.IRequest;

  const emptyResult: IPageIEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.index(
      connection,
      { body: emptyFilterRequest },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result data length is zero",
    emptyResult.data.length,
    0,
  );

  // 11. Test unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.assessments.index(
      unauthConn,
      { body: baseSearchRequest },
    );
  });
}
