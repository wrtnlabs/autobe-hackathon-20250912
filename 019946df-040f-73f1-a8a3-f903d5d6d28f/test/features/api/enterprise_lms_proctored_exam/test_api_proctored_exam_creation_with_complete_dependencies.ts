import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

export async function test_api_proctored_exam_creation_with_complete_dependencies(
  connection: api.IConnection,
) {
  // Step 1: Register a new corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "password123";
  const joinBody = {
    tenant_id: tenantId,
    email,
    password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joinedUser = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(joinedUser);

  // Step 2: Login to authenticate and switch token
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInUser = await api.functional.auth.corporateLearner.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInUser);
  TestValidator.equals(
    "join and login user IDs match",
    joinedUser.id,
    loggedInUser.id,
  );

  // Step 3: Generate a random assessment ID
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create a proctored exam session linked to that assessment
  const scheduledAt = new Date(Date.now() + 86400000).toISOString();
  const examSessionId = RandomGenerator.alphaNumeric(16);
  const proctorId = RandomGenerator.alphaNumeric(8);

  const createBody = {
    assessment_id: assessmentId,
    exam_session_id: examSessionId,
    proctor_id: proctorId,
    scheduled_at: scheduledAt,
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam =
    await api.functional.enterpriseLms.corporateLearner.assessments.proctoredExams.create(
      connection,
      {
        assessmentId,
        body: createBody,
      },
    );
  typia.assert(proctoredExam);

  // Step 5: Validate that returned proctoredExam matches input and has required fields
  TestValidator.equals(
    "assessmentId matches",
    proctoredExam.assessment_id,
    assessmentId,
  );
  TestValidator.equals(
    "examSessionId matches",
    proctoredExam.exam_session_id,
    examSessionId,
  );
  TestValidator.equals(
    "proctorId matches",
    proctoredExam.proctor_id,
    proctorId,
  );
  TestValidator.equals(
    "status is scheduled",
    proctoredExam.status,
    "scheduled",
  );
  TestValidator.predicate(
    "createdAt is ISO date",
    typia.is<string & tags.Format<"date-time">>(proctoredExam.created_at),
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    typia.is<string & tags.Format<"date-time">>(proctoredExam.updated_at),
  );
  if (
    proctoredExam.deleted_at !== null &&
    proctoredExam.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deletedAt is ISO date",
      typia.is<string & tags.Format<"date-time">>(proctoredExam.deleted_at),
    );
  }
}
