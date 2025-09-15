import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

export async function test_api_blended_learning_session_search_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const userCreateBody = {
    tenant_id: tenantId,
    email: `test_user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const user: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Step 2: Search for blended learning sessions filtered with pagination
  const requestBody: IEnterpriseLmsBlendedLearningSession.IRequest = {
    page: 1,
    limit: 10,
  };

  const result: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.corporateLearner.blendedLearningSessions.index(
      connection,
      { body: requestBody },
    );
  typia.assert(result);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is positive",
    typeof result.pagination.current === "number" &&
      result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    typeof result.pagination.limit === "number" && result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof result.pagination.records === "number" &&
      result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof result.pagination.pages === "number" && result.pagination.pages >= 0,
  );

  // Validate data array exists and contents have required properties
  TestValidator.predicate("data is array", Array.isArray(result.data));

  if (result.data.length > 0) {
    for (const session of result.data) {
      typia.assert(session);
      TestValidator.predicate(
        "scheduled_start_at valid ISO",
        typeof session.scheduled_start_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
            session.scheduled_start_at,
          ),
      );

      TestValidator.predicate(
        "status is string",
        typeof session.status === "string",
      );

      TestValidator.predicate(
        "title is string",
        typeof session.title === "string",
      );

      TestValidator.predicate(
        "id is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          session.id,
        ),
      );
    }
  }

  // Attempt accessing the endpoint without authentication to check denial
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.enterpriseLms.corporateLearner.blendedLearningSessions.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
