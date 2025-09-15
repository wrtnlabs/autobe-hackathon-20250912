import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

/**
 * E2E test for blended learning session search with external learner
 * authentication.
 *
 * This test covers the entire workflow from external learner registration
 * to authenticated searching of blended learning sessions with filters and
 * pagination.
 *
 * Steps:
 *
 * 1. Register a new external learner user using realistic random data.
 * 2. Assert join response properly authenticates user and provides JWT tokens.
 * 3. Perform multiple searches for blended learning sessions using various
 *    filters and pagination options.
 * 4. Assert returned sessions are scoped to external learner's tenant ID (not
 *    verifiable in session summary DTO).
 * 5. Validate pagination metadata correctness and content filtering.
 * 6. Test unauthorized access rejection.
 */
export async function test_api_external_learner_blended_learning_session_search_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register new external learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const authorizedExternalLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(authorizedExternalLearner);

  // 2. Verify tokens exist
  TestValidator.predicate(
    "access token exists",
    typeof authorizedExternalLearner.token.access === "string" &&
      authorizedExternalLearner.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof authorizedExternalLearner.token.refresh === "string" &&
      authorizedExternalLearner.token.refresh.length > 0,
  );

  const tenantId = authorizedExternalLearner.tenant_id;

  // Helper function to validate pagination
  function validatePagination(
    pagination: IPage.IPagination,
    page?: number,
    limit?: number,
  ): void {
    TestValidator.predicate(
      "pagination: current is non-negative",
      pagination.current >= 0,
    );
    if (page !== undefined) {
      TestValidator.equals(
        "pagination: current equals requested page or default 0",
        pagination.current,
        page,
      );
    }

    TestValidator.predicate(
      "pagination: limit is positive",
      pagination.limit > 0,
    );
    if (limit !== undefined) {
      TestValidator.equals(
        "pagination: limit equals requested limit",
        pagination.limit,
        limit,
      );
    }

    TestValidator.predicate(
      "pagination: pages is non-negative",
      pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination: records is non-negative",
      pagination.records >= 0,
    );
    TestValidator.equals(
      "pagination: pages equals ceil(records/limit)",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  }

  // Helper function to verify each session summary
  function validateSessionSummary(
    session: IEnterpriseLmsBlendedLearningSession.ISummary,
    statusFilter?: string | undefined,
    sessionTypeFilter?: string | undefined,
  ) {
    typia.assert(session);
    TestValidator.predicate(
      "session: valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    if (statusFilter !== undefined) {
      TestValidator.equals(
        "session: status matches filter",
        session.status,
        statusFilter,
      );
    }
    if (sessionTypeFilter !== undefined) {
      // Currently cannot validate session_type as it's not in summary DTO
      // Session_type filter can be passed in requests but not verified here
    }
  }

  // 3a. Call search with empty request body (default filters)
  const emptyRequestBody =
    {} satisfies IEnterpriseLmsBlendedLearningSession.IRequest;
  const resultNoFilter: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.index(
      connection,
      { body: emptyRequestBody },
    );
  typia.assert(resultNoFilter);
  validatePagination(resultNoFilter.pagination);
  resultNoFilter.data.forEach((session) => {
    validateSessionSummary(session);
  });

  // 3b. Call search with status "scheduled" filter
  const statusFilterBody = {
    status: "scheduled",
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;
  const resultStatusFilter =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.index(
      connection,
      { body: statusFilterBody },
    );
  typia.assert(resultStatusFilter);
  validatePagination(resultStatusFilter.pagination);
  resultStatusFilter.data.forEach((session) => {
    validateSessionSummary(session, "scheduled");
  });

  // 3c. Call search with pagination page=1, limit=5
  const paginationBody = {
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;
  const resultPagination =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.index(
      connection,
      { body: paginationBody },
    );
  typia.assert(resultPagination);
  validatePagination(resultPagination.pagination, 1, 5);
  resultPagination.data.forEach((session) => {
    validateSessionSummary(session);
  });

  // 3d. Call search with scheduled_start_at_from and scheduled_end_at_to filters
  const startFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateRangeBody = {
    scheduled_start_at_from: startFrom,
    scheduled_end_at_to: endTo,
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;
  const resultDateRange =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.index(
      connection,
      { body: dateRangeBody },
    );
  typia.assert(resultDateRange);
  validatePagination(resultDateRange.pagination);
  resultDateRange.data.forEach((session) => {
    validateSessionSummary(session);
  });

  // 4. Verify all session tenant IDs match - NOT possible as summary DTO lacks tenant_id
  // This is a known limitation and tenant scoping validation is by API security

  // 5. Negative test: access without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized request fails", async () => {
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.index(
      unauthConnection,
      { body: {} },
    );
  });
}
