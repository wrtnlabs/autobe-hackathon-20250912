import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This comprehensive E2E test validates the detailed retrieval of a specific
 * proctored exam session under an assessment by a user with the systemAdmin
 * role within the Enterprise LMS. It tests positive retrieval of valid
 * proctored exam details, negative invalid ID cases, and unauthorized access
 * rejection.
 *
 * The test flow includes:
 *
 * 1. Creating a systemAdmin user via join endpoint
 * 2. Logging in as the created systemAdmin user
 * 3. Successfully retrieving proctored exam details for valid assessment and exam
 *    IDs
 * 4. Attempting retrieval with invalid assessment ID expecting error
 * 5. Attempting retrieval with invalid proctored exam ID expecting error
 * 6. Attempting retrieval with unauthenticated connection expecting authorization
 *    error
 *
 * This ensures role-based access control, tenant data isolation, and API
 * contract adherence.
 */
export async function test_api_proctored_exam_detail_retrieval_authorized_and_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create a systemAdmin user via join
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(systemAdmin);

  // 2. Login with same credentials
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const login: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(login);

  // Extract valid assessmentId and proctoredExamId
  const validAssessmentId = typia.random<string & tags.Format<"uuid">>();
  const validProctoredExamId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve proctored exam detail with valid IDs
  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
      connection,
      {
        assessmentId: validAssessmentId,
        proctoredExamId: validProctoredExamId,
      },
    );
  typia.assert(proctoredExam);

  // Ensure that ids in response match the request parameters, enforcing tenant data isolation
  TestValidator.equals(
    "proctoredExam assessmentId matches",
    proctoredExam.assessment_id,
    validAssessmentId,
  );
  TestValidator.equals(
    "proctoredExam id matches",
    proctoredExam.id,
    validProctoredExamId,
  );

  // 4. Attempt retrieval with invalid (non-existent) assessmentId
  await TestValidator.error(
    "retrieve proctored exam with invalid assessmentId should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          proctoredExamId: validProctoredExamId,
        },
      );
    },
  );

  // 5. Attempt retrieval with invalid (non-existent) proctoredExamId
  await TestValidator.error(
    "retrieve proctored exam with invalid proctoredExamId should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
        connection,
        {
          assessmentId: validAssessmentId,
          proctoredExamId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt retrieval without authentication (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized retrieve proctored exam should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.at(
        unauthConn,
        {
          assessmentId: validAssessmentId,
          proctoredExamId: validProctoredExamId,
        },
      );
    },
  );
}
