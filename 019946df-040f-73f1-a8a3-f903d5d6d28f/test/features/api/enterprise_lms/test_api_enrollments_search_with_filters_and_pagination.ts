import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollment";

export async function test_api_enrollments_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "")}@example.com`;
  const password = "TestPass123";
  const first_name = RandomGenerator.name(1);
  const last_name = RandomGenerator.name(1);

  const createPayload = {
    tenant_id,
    email,
    password,
    first_name,
    last_name,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createPayload,
    });
  typia.assert(createdUser);

  // 2. Login the registered learner
  const loginPayload = {
    email: createdUser.email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginPayload,
    });
  typia.assert(loggedUser);

  // 3. Prepare various filters for searching enrollments
  // We use the learner_id and tenant_id obtained from logged user as key filters
  const learnerId = createdUser.id;
  const learningPathId = typia.random<string & tags.Format<"uuid">>();
  const status = "active";
  const businessStatus = null;

  // Pagination and sorting
  const page = 1;
  const limit = 10;
  const orderBy = "created_at";
  const orderDirection = "desc" as "asc" | "desc";

  const filterRequest = {
    learner_id: learnerId,
    learning_path_id: learningPathId,
    status,
    business_status: businessStatus,
    page,
    limit,
    orderBy,
    orderDirection,
  } satisfies IEnterpriseLmsEnrollment.IRequest;

  // 4. Call the filtered enrollment index endpoint
  const enrollmentsPage: IPageIEnterpriseLmsEnrollment.ISummary =
    await api.functional.enterpriseLms.corporateLearner.enrollments.indexEnrollments(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(enrollmentsPage);

  // 5. Validate pagination fields
  const pagination = enrollmentsPage.pagination;
  TestValidator.predicate(
    "pagination current page matches request",
    pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // 6. Validate enrollments match the requested filters (learner_id and learning_path_id at least)
  for (const enrollment of enrollmentsPage.data) {
    TestValidator.equals(
      "enrollment learner_id matches filter",
      enrollment.learner_id,
      learnerId,
    );
    TestValidator.equals(
      "enrollment learning_path_id matches filter",
      enrollment.learning_path_id,
      learningPathId,
    );
    TestValidator.equals(
      "enrollment status matches filter",
      enrollment.status,
      status,
    );
  }

  // 7. Test for error scenario with invalid filter parameter
  await TestValidator.error(
    "filtering with invalid UUID learner_id should fail",
    async () => {
      const invalidFilter = {
        learner_id: "invalid-uuid-format" as unknown as string &
          tags.Format<"uuid">,
        page,
        limit,
      } satisfies IEnterpriseLmsEnrollment.IRequest;
      await api.functional.enterpriseLms.corporateLearner.enrollments.indexEnrollments(
        connection,
        {
          body: invalidFilter,
        },
      );
    },
  );

  // 8. Test empty result filtering with non-existent learner_id
  const nonExistentLearnerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResultFilter = {
    learner_id: nonExistentLearnerId,
    page: 1,
    limit: 10,
  } satisfies IEnterpriseLmsEnrollment.IRequest;

  const emptyResultPage: IPageIEnterpriseLmsEnrollment.ISummary =
    await api.functional.enterpriseLms.corporateLearner.enrollments.indexEnrollments(
      connection,
      {
        body: emptyResultFilter,
      },
    );
  typia.assert(emptyResultPage);
  TestValidator.equals(
    "empty result data length",
    emptyResultPage.data.length,
    0,
  );
}
