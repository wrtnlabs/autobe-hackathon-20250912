import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

/**
 * Tests detailed retrieval of a project member within a project by an
 * authorized PMO user.
 *
 * This test covers the complete flow:
 *
 * 1. PMO user joins, establishing an account with required privileges.
 * 2. PMO user logs in to authenticate and obtain tokens.
 * 3. Use authenticated context to retrieve a project member's detailed info by
 *    projectId and memberId.
 * 4. Validate the retrieved data matches the ITaskManagementProjectMember
 *    structure.
 * 5. Ensure compliance with expected UUID formats for identifiers.
 * 6. Verify appropriate authorization is respected implicitly by successful
 *    calls.
 * 7. Assert all API responses with strong type validation using typia.
 */
export async function test_api_project_member_detailed_retrieval_pmo_role(
  connection: api.IConnection,
) {
  // 1. PMO user joins to create an authorized user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const authorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. PMO user logs in with the same credentials to authenticate
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loginAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  // 3. Generate UUIDs for projectId and memberId to simulate retrieval
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve project member detailed info using the authenticated context
  const memberDetail: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.at(connection, {
      projectId,
      memberId,
    });
  typia.assert(memberDetail);

  // 5. Validate the essential fields for UUID format
  TestValidator.predicate(
    "projectId has UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberDetail.project_id,
    ),
  );
  TestValidator.predicate(
    "memberId has UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberDetail.id,
    ),
  );
  TestValidator.predicate(
    "userId has UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberDetail.user_id,
    ),
  );

  // 6. Validate created_at and updated_at fields are valid date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof memberDetail.created_at === "string" &&
      !isNaN(Date.parse(memberDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof memberDetail.updated_at === "string" &&
      !isNaN(Date.parse(memberDetail.updated_at)),
  );

  // 7. deleted_at is either null, undefined, or ISO date-time string if present
  if (
    memberDetail.deleted_at !== null &&
    memberDetail.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 date-time or null/undefined",
      typeof memberDetail.deleted_at === "string" &&
        !isNaN(Date.parse(memberDetail.deleted_at)),
    );
  }
}
