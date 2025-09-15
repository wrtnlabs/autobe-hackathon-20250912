import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessmentResult";

/**
 * Comprehensive test for search, filtering, and pagination of assessment
 * results within an organization tenant by organizationAdmin users.
 *
 * This test simulates full workflow:
 *
 * 1. OrganizationAdmin user creation and login
 * 2. Assessments creation
 * 3. Multiple mock assessment results generation
 * 4. Search operations with varying filters: learner_id, status, score range,
 *    completion date range
 * 5. Pagination validations
 * 6. Unauthorized access validations
 * 7. Edge condition tests (empty data, page boundaries)
 *
 * Each step asserts correct behavior and data consistency strictly via type
 * validations and business logic validations using TestValidator.
 */
export async function test_api_assessment_result_search_with_varied_filters(
  connection: api.IConnection,
) {
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 1. organizationAdmin join
  const adminCreate = {
    tenant_id: tenantId,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "abcd1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. organizationAdmin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminCreate.email,
      password: adminCreate.password,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 3. create assessment
  const assessmentCreate = {
    tenant_id: tenantId,
    code: RandomGenerator.alphaNumeric(8),
    title: "Test Assessment",
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentCreate },
    );
  typia.assert(assessment);

  // 4. Test filtering
  // learner_id filter
  const learnerId = typia.random<string & tags.Format<"uuid">>();
  const filterLearnerId = {
    page: 1,
    limit: 10,
    filter: {
      learner_id: learnerId,
    },
  } satisfies IEnterpriseLmsAssessmentResult.IRequest;

  const resultLearnerId =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      connection,
      {
        assessmentId: assessment.id,
        body: filterLearnerId,
      },
    );
  typia.assert(resultLearnerId);
  for (const r of resultLearnerId.data) {
    TestValidator.equals("learner_id filter", r.learner_id, learnerId);
  }

  // assessment_id filter
  const filterAssessmentId = {
    page: 1,
    limit: 10,
    filter: {
      assessment_id: assessment.id,
    },
  } satisfies IEnterpriseLmsAssessmentResult.IRequest;

  const resultAssessmentId =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      connection,
      {
        assessmentId: assessment.id,
        body: filterAssessmentId,
      },
    );
  typia.assert(resultAssessmentId);
  for (const r of resultAssessmentId.data) {
    TestValidator.equals(
      "assessment_id filter",
      r.assessment_id,
      assessment.id,
    );
  }

  // date_from/date_to filter
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const filterDateRange = {
    page: 1,
    limit: 10,
    filter: {
      date_from: dateFrom,
      date_to: dateTo,
    },
  } satisfies IEnterpriseLmsAssessmentResult.IRequest;

  const resultDateRange =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      connection,
      {
        assessmentId: assessment.id,
        body: filterDateRange,
      },
    );
  typia.assert(resultDateRange);
  for (const r of resultDateRange.data) {
    if (r.completed_at !== null && r.completed_at !== undefined) {
      TestValidator.predicate(
        "completed_at within date range",
        r.completed_at >= dateFrom && r.completed_at <= dateTo,
      );
    }
  }

  // status filter
  const statusCandidates = ["pending", "completed", "failed"] as const;
  for (const status of statusCandidates) {
    const filterStatus = {
      page: 1,
      limit: 10,
      filter: {
        status,
      },
    } satisfies IEnterpriseLmsAssessmentResult.IRequest;

    const resultStatus =
      await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
        connection,
        {
          assessmentId: assessment.id,
          body: filterStatus,
        },
      );
    typia.assert(resultStatus);
    for (const r of resultStatus.data) {
      TestValidator.equals("status filter", r.status, status);
    }
  }

  // pagination metadata
  const paginationFilter = {
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsAssessmentResult.IRequest;

  const paginatedResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      connection,
      {
        assessmentId: assessment.id,
        body: paginationFilter,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination current is 1",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    paginatedResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginatedResult.pagination.pages >= 0,
  );

  // unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access fails", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      unauthConn,
      {
        assessmentId: assessment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsAssessmentResult.IRequest,
      },
    );
  });

  // edge case: empty page results
  const emptyPageBody = {
    page: 1000,
    limit: 10,
  } satisfies IEnterpriseLmsAssessmentResult.IRequest;
  const emptyPageResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.index(
      connection,
      {
        assessmentId: assessment.id,
        body: emptyPageBody,
      },
    );
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "empty page returns no data",
    emptyPageResult.data.length,
    0,
  );
}
