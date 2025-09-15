import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Tests the failure scenarios for deleting an assessment result due to
 * authorization failures.
 *
 * This test validates that unauthorized attempts to delete an assessment
 * result are properly rejected. It covers:
 *
 * 1. Deletion attempt without authentication (should be denied).
 * 2. SystemAdmin authentication (join operation) to obtain credentials.
 * 3. Deletion attempts with valid UUIDs but unauthorized or non-existent
 *    resources.
 * 4. Deletion attempts with malformed or invalid assessmentId and resultId,
 *    expecting validation error.
 *
 * Each error case uses TestValidator.error with clear titles.
 *
 * @param connection - The API connection instance.
 */
export async function test_api_assessment_result_deletion_authorization_failure(
  connection: api.IConnection,
) {
  // 1. Attempt deletion without authentication: expect failure
  await TestValidator.error(
    "delete without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          resultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 2. Authenticate as SystemAdmin
  const systemAdminCreateData = {
    email: `sysadmin${Date.now()}@example.com`,
    password_hash: "$2b$10$abcdefghijklmnopqrstuv", // dummy hash, satisfies string
    first_name: "System",
    last_name: "Admin",
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const authorizedSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateData,
    });
  typia.assert(authorizedSystemAdmin);

  // 3. Attempt deletion with valid UUIDs but unauthorized
  await TestValidator.error(
    "delete with valid UUIDs but unauthorized should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          resultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Try invalid or malformed assessmentId and resultId values
  const invalidAssessmentIds = [
    "",
    "not-a-uuid",
    "1234",
    "00000000-0000-0000-0000-00000000000z",
  ];
  const invalidResultIds = [
    "",
    "invalid-uuid",
    "abcd",
    "00000000-0000-0000-0000-00000000000w",
  ];

  for (const assessmentId of invalidAssessmentIds) {
    for (const resultId of invalidResultIds) {
      await TestValidator.error(
        `delete with invalid assessmentId='${assessmentId}' and resultId='${resultId}' should fail`,
        async () => {
          await api.functional.enterpriseLms.systemAdmin.assessments.results.erase(
            connection,
            {
              assessmentId: assessmentId as string & tags.Format<"uuid">,
              resultId: resultId as string & tags.Format<"uuid">,
            },
          );
        },
      );
    }
  }
}
