import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * Test the deletion of an assessment question by contentCreatorInstructor.
 *
 * This E2E test covers the full flow of a contentCreatorInstructor user
 * joining, logging in, and deleting an assessment question from the enterprise
 * LMS.
 *
 * It uses a valid UUID for assessmentId and questionId since the creation APIs
 * or retrieval mechanisms are not provided.
 *
 * It tests a successful deletion and negative cases with invalid and
 * unauthorized attempts.
 */
export async function test_api_assessment_question_deletion_by_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. ContentCreatorInstructor joins (registers)
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordPlain = "StrongPass!123";
  const passwordHash = passwordPlain; // For test simplicity, assume plain password as hash

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const user = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(user);

  // 2. Login as contentCreatorInstructor with email and plain password
  const loginBody = {
    email: email,
    password: passwordPlain,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const authorizedUser =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(authorizedUser);

  // 3. Generate valid assessmentId and questionId (UUID strings) for testing deletion
  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const questionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Perform the deletion call
  await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.erase(
    connection,
    {
      assessmentId: assessmentId,
      questionId: questionId,
    },
  );

  // 5. Negative test: deletion with invalid assessmentId (bad UUID) - expect error
  await TestValidator.error(
    "deletion fails with invalid assessmentId",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.erase(
        connection,
        {
          assessmentId: "invalid-uuid-format",
          questionId: questionId,
        },
      );
    },
  );

  // 6. Negative test: deletion with invalid questionId (bad UUID) - expect error
  await TestValidator.error(
    "deletion fails with invalid questionId",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.erase(
        connection,
        {
          assessmentId: assessmentId,
          questionId: "invalid-uuid-format",
        },
      );
    },
  );

  // 7. Negative test: unauthorized attempt (simulate by creating a fresh connection with no auth)
  //    We assume no auth header -> unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "deletion fails for unauthorized user",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.erase(
        unauthConn,
        {
          assessmentId: assessmentId,
          questionId: questionId,
        },
      );
    },
  );
}
