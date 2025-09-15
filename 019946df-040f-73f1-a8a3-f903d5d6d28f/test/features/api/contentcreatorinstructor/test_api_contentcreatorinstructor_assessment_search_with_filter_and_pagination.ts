import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessments";

/**
 * Validates the search and listing functionality for assessments by a
 * contentCreatorInstructor user in an enterprise LMS.
 *
 * This test covers the full business flow including user registration,
 * authentication to acquire JWT tokens, and subsequent authorized search
 * requests using PATCH method with varied filters like tenant_id and
 * assessment code.
 *
 * The test validates correct filtering behavior with tenant isolation,
 * proper application of pagination (page, limit), and sorting order along
 * assessment meta properties. It also includes validation of edge cases
 * such as empty datasets, invalid pagination inputs, and unauthorized
 * access attempts ensuring secure permission checks.
 *
 * Detailed checks for pagination metadata in responses ensure total counts
 * and pages tally correctly with requests. All responses are fully asserted
 * for schema conformance. Unauthorized or malformed requests must raise
 * errors.
 *
 * Steps:
 *
 * 1. Create a contentCreatorInstructor using the join API.
 * 2. Log in with the same credentials to authenticate.
 * 3. Search assessments filtered by tenant_id with pagination.
 * 4. Validate response data consistency and tenant_id filtering.
 * 5. Search with code substring filter applied.
 * 6. Test pagination across multiple pages.
 * 7. Test sorting ascending and descending by title and assessment_type.
 * 8. Edge cases of no results and invalid pagination parameters.
 * 9. Verify unauthorized request rejection.
 */
export async function test_api_contentcreatorinstructor_assessment_search_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register new contentCreatorInstructor
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1)}.${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const created = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    { body: createBody },
  );
  typia.assert(created);

  // Capture tenant_id for filtering tests
  const tenantId = created.tenant_id;

  // 2. Log in to obtain JWT tokens
  const loginBody = {
    email: createBody.email,
    password: createBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const loggedIn = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedIn);

  // 3. Perform a search filtering by tenant_id with pagination
  const pageRequest1 = {
    tenant_id: tenantId,
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsAssessments.IRequest;
  const response1 =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: pageRequest1 },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "pagination current page is 1",
    response1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    response1.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages is >= 1",
    response1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records count matches or exceeds data length",
    response1.pagination.records >= response1.data.length,
  );
  // Validate all assessments belong to tenant_id
  for (const assessment of response1.data) {
    TestValidator.equals(
      "assessment tenant_id matches query tenant_id",
      assessment.tenant_id,
      tenantId,
    );
  }

  // 4. Test filtering by assessment code substring
  const codeSample =
    response1.data.length > 0 ? response1.data[0].code.slice(0, 3) : "";
  if (codeSample !== "") {
    const codeFilterRequest = {
      tenant_id: tenantId,
      code: codeSample,
      page: 1,
      limit: 5,
    } satisfies IEnterpriseLmsAssessments.IRequest;
    const codeFilterResponse =
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
        connection,
        { body: codeFilterRequest },
      );
    typia.assert(codeFilterResponse);
    for (const assessment of codeFilterResponse.data) {
      TestValidator.predicate(
        "assessment code contains filter substring",
        assessment.code.includes(codeSample),
      );
      TestValidator.equals(
        "assessment tenant_id matches",
        assessment.tenant_id,
        tenantId,
      );
    }
  }

  // 5. Test pagination across multiple pages if available
  if (response1.pagination.pages > 1) {
    const page2Request = {
      tenant_id: tenantId,
      page: 2,
      limit: response1.pagination.limit,
    } satisfies IEnterpriseLmsAssessments.IRequest;
    const responsePage2 =
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
        connection,
        { body: page2Request },
      );
    typia.assert(responsePage2);
    TestValidator.predicate(
      "pagination current page is 2",
      responsePage2.pagination.current === 2,
    );
    for (const assessment of responsePage2.data) {
      TestValidator.equals(
        "assessment tenant_id matches page 2",
        assessment.tenant_id,
        tenantId,
      );
    }
  }

  // 6. Test sorting ascending and descending by title
  const orderByTitleAsc = {
    tenant_id: tenantId,
    orderBy: "title",
    orderDirection: "asc",
    page: 1,
    limit: 10,
  } satisfies IEnterpriseLmsAssessments.IRequest;
  const titleAscResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: orderByTitleAsc },
    );
  typia.assert(titleAscResponse);
  // Validate sorting ascending by title
  for (let i = 1; i < titleAscResponse.data.length; i++) {
    TestValidator.predicate(
      "title ascending order",
      titleAscResponse.data[i - 1].title <= titleAscResponse.data[i].title,
    );
  }

  const orderByTitleDesc = {
    ...orderByTitleAsc,
    orderDirection: "desc",
  } satisfies IEnterpriseLmsAssessments.IRequest;
  const titleDescResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: orderByTitleDesc },
    );
  typia.assert(titleDescResponse);
  // Validate sorting descending by title
  for (let i = 1; i < titleDescResponse.data.length; i++) {
    TestValidator.predicate(
      "title descending order",
      titleDescResponse.data[i - 1].title >= titleDescResponse.data[i].title,
    );
  }

  // 7. Test sorting ascending and descending by assessment_type
  const orderByTypeAsc = {
    tenant_id: tenantId,
    orderBy: "assessment_type",
    orderDirection: "asc",
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsAssessments.IRequest;
  const typeAscResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: orderByTypeAsc },
    );
  typia.assert(typeAscResponse);
  for (let i = 1; i < typeAscResponse.data.length; i++) {
    TestValidator.predicate(
      "assessment_type ascending order",
      typeAscResponse.data[i - 1].assessment_type <=
        typeAscResponse.data[i].assessment_type,
    );
  }

  const typeDescRequest = {
    ...orderByTypeAsc,
    orderDirection: "desc",
  } satisfies IEnterpriseLmsAssessments.IRequest;
  const typeDescResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: typeDescRequest },
    );
  typia.assert(typeDescResponse);
  for (let i = 1; i < typeDescResponse.data.length; i++) {
    TestValidator.predicate(
      "assessment_type descending order",
      typeDescResponse.data[i - 1].assessment_type >=
        typeDescResponse.data[i].assessment_type,
    );
  }

  // 8. Edge case: No results when filtering on impossible tenant_id
  const noResultsRequest = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(), // random new tenant_id unlikely to match
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsAssessments.IRequest;
  const noResultsResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: noResultsRequest },
    );
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "no data with impossible tenant_id",
    noResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero for no data",
    noResultsResponse.pagination.records,
    0,
  );

  // 9. Edge case: invalid pagination parameters should be rejected
  await TestValidator.error("invalid page value", async () => {
    const invalidPageRequest = {
      tenant_id: tenantId,
      page: 0, // invalid page number less than 1
      limit: 5,
    } satisfies IEnterpriseLmsAssessments.IRequest;
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: invalidPageRequest },
    );
  });
  await TestValidator.error("invalid limit value", async () => {
    const invalidLimitRequest = {
      tenant_id: tenantId,
      page: 1,
      limit: 0, // invalid limit less than 1
    } satisfies IEnterpriseLmsAssessments.IRequest;
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      connection,
      { body: invalidLimitRequest },
    );
  });

  // 10. Edge case: unauthorized access without login
  // Create a separate connection without authorization headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access rejected", async () => {
    const request = {
      page: 1,
      limit: 5,
    } satisfies IEnterpriseLmsAssessments.IRequest;
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.index(
      unauthConnection,
      { body: request },
    );
  });
}
