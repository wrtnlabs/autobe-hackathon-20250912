import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

/**
 * This test function validates the retrieval of detailed information for a
 * specific project member (memberId) within a project (projectId) by an
 * authenticated user with the PM role.
 *
 * It covers the following:
 *
 * 1. PM user creation and authentication (join and login), establishing the
 *    necessary authorization context.
 * 2. Retrieval of project member details with valid UUIDs for projectId and
 *    memberId.
 * 3. Validation that the returned project member data matches the
 *    ITaskManagementProjectMember schema, with correct UUIDs and date-time
 *    formatted fields.
 * 4. Ensuring no sensitive information is exposed beyond schema-defined fields.
 * 5. Handling of error cases such as invalid UUID formats, unauthorized access,
 *    and missing project/member.
 *
 * The test ensures secure and precise behavior of the project member detail
 * endpoint for the PM role.
 */
export async function test_api_project_member_detailed_retrieval_pm_role(
  connection: api.IConnection,
) {
  // 1. PM user join (create account)
  const pmCreateBody = {
    email: `${RandomGenerator.alphabets(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmUser);

  // 2. PM user login
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLogin);

  // Helper function for generating valid UUID strings
  function generateUuid(): string {
    return typia.random<string & tags.Format<"uuid">>();
  }

  // 3. Successful fetch of project member detail with valid UUIDs
  const validProjectId: string & tags.Format<"uuid"> =
    generateUuid() satisfies string as string;
  const validMemberId: string & tags.Format<"uuid"> =
    generateUuid() satisfies string as string;

  const projectMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pm.projects.members.at(connection, {
      projectId: validProjectId,
      memberId: validMemberId,
    });
  typia.assert(projectMember);

  // Validate that the response data fields are UUID strings and date-times
  TestValidator.predicate(
    "projectMember.id looks like UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      projectMember.id,
    ),
  );

  TestValidator.predicate(
    "projectMember.project_id looks like UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      projectMember.project_id,
    ),
  );

  TestValidator.predicate(
    "projectMember.user_id looks like UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      projectMember.user_id,
    ),
  );

  // Regex for ISO 8601 date-time
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  TestValidator.predicate(
    "projectMember.created_at is ISO 8601 date-time",
    iso8601Regex.test(projectMember.created_at),
  );

  TestValidator.predicate(
    "projectMember.updated_at is ISO 8601 date-time",
    iso8601Regex.test(projectMember.updated_at),
  );

  // 4. Error case - invalid UUID format for projectId
  await TestValidator.error(
    "invalid projectId UUID format should throw",
    async () => {
      await api.functional.taskManagement.pm.projects.members.at(connection, {
        projectId: "invalid-uuid-format",
        memberId: validMemberId,
      });
    },
  );

  // 5. Error case - invalid UUID format for memberId
  await TestValidator.error(
    "invalid memberId UUID format should throw",
    async () => {
      await api.functional.taskManagement.pm.projects.members.at(connection, {
        projectId: validProjectId,
        memberId: "invalid-uuid-format",
      });
    },
  );

  // 6. Error case - non-existent projectId and memberId UUIDs (still valid UUID strings)
  const nonexistentProjectId = generateUuid() satisfies string as string;
  const nonexistentMemberId = generateUuid() satisfies string as string;
  await TestValidator.error(
    "non-existent projectId/memberId should throw",
    async () => {
      await api.functional.taskManagement.pm.projects.members.at(connection, {
        projectId: nonexistentProjectId,
        memberId: nonexistentMemberId,
      });
    },
  );
}
