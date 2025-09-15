import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessmentResult";

/**
 * End-to-end test for searching assessment results as an organization
 * administrator.
 *
 * This test covers the flow where an organization admin user and a content
 * creator instructor user are created. Both users authenticate
 * appropriately. The test ensures that the organization admin can search
 * for assessment results by applying filters and pagination criteria using
 * the PATCH endpoint.
 *
 * The test verifies that pagination info and data consistency are correct,
 * and confirms that unauthorized attempts to search assessment results fail
 * properly.
 */
export async function test_api_assessment_results_search_as_organization_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin joins and authenticates
  const organizationAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: organizationAdminCreateBody,
    },
  );
  typia.assert(organizationAdmin);

  // 2. Content creator instructor joins and authenticates
  const creatorInstructorCreateBody = {
    tenant_id: organizationAdmin.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const creatorInstructor =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: creatorInstructorCreateBody,
    });
  typia.assert(creatorInstructor);

  // 3. Login as content creator instructor
  const creatorInstructorLoginBody = {
    email: creatorInstructor.email,
    password: creatorInstructorCreateBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const creatorInstructorLogin =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: creatorInstructorLoginBody,
    });
  typia.assert(creatorInstructorLogin);

  // 4. Login as organization admin
  const organizationAdminLoginBody = {
    email: organizationAdminCreateBody.email,
    password: organizationAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const organizationAdminLogin =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: organizationAdminLoginBody,
    });
  typia.assert(organizationAdminLogin);

  // 5. Prepare assessment ID for search (simulate as random UUID)
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // 6. Perform search for assessment results with filters
  const searchRequest = {
    page: 1,
    limit: 10,
    search: null,
    filter: {
      assessment_id: assessmentId,
      learner_id: null,
      status: null,
      date_from: null,
      date_to: null,
    },
    sort: {
      field: "score",
      order: "desc",
    },
  } satisfies IEnterpriseLmsAssessmentResult.IRequest;

  const searchResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      connection,
      {
        assessmentId: assessmentId,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "pagination pages should be >= 0",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchResult.pagination.limit > 0,
  );

  // 7. Test unauthorized access returns error
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("error on unauthorized search", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      unauthorizedConnection,
      {
        assessmentId: assessmentId,
        body: searchRequest,
      },
    );
  });
}
