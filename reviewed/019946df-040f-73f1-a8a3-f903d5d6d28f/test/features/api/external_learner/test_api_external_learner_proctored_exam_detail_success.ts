import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

/**
 * Test scenario for external learner joining and retrieving proctored exam
 * details.
 *
 * This test verifies that an external learner can create an account
 * successfully, authenticate, and retrieve detailed information about a
 * specific proctored exam. It validates the API response strictly against
 * the IEnterpriseLmsProctoredExam DTO.
 *
 * The test also checks error scenarios such as using invalid UUIDs and
 * unauthorized access attempts, ensuring proper error handling without
 * violating type safety.
 *
 * Steps:
 *
 * 1. External learner registration with random but valid data.
 * 2. Join API call to create and authenticate the user.
 * 3. Retrieve proctored exam detail with valid assessmentId and
 *    proctoredExamId.
 * 4. Validate the API response for correctness.
 * 5. Attempt retrieval with invalid assessmentId and proctoredExamId to verify
 *    error throwing.
 * 6. The test honors all typing rules and connection header management is
 *    handled by SDK.
 */
export async function test_api_external_learner_proctored_exam_detail_success(
  connection: api.IConnection,
) {
  // Step 1-2: External learner join and authentication
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const externalLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(externalLearner);

  // Step 3: Retrieve proctored exam details with valid IDs
  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const proctoredExamId = typia.random<string & tags.Format<"uuid">>();

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.at(
      connection,
      {
        assessmentId,
        proctoredExamId,
      },
    );
  typia.assert(proctoredExam);

  // Step 4: Validate key business properties
  TestValidator.equals(
    "proctored exam assessmentId matches",
    proctoredExam.assessment_id,
    assessmentId,
  );
  TestValidator.equals(
    "proctored exam id matches",
    proctoredExam.id,
    proctoredExamId,
  );
  TestValidator.predicate(
    "proctored exam status is valid",
    ["scheduled", "in_progress", "completed", "cancelled"].includes(
      proctoredExam.status,
    ),
  );

  // Step 5: Test errors with invalid UUIDs
  await TestValidator.error(
    "invalid assessmentId format should throw",
    async () => {
      await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.at(
        connection,
        {
          // Intentionally invalid UUID
          assessmentId: "invalid-uuid-string" as string & tags.Format<"uuid">,
          proctoredExamId,
        },
      );
    },
  );

  await TestValidator.error(
    "invalid proctoredExamId format should throw",
    async () => {
      await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.at(
        connection,
        {
          assessmentId,
          // Intentionally invalid UUID
          proctoredExamId: "invalid-uuid-string" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // Step 6: Test unauthorized access with a non-existent proctoredExamId
  const fakeProctoredExamId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent proctoredExamId should throw error",
    async () => {
      await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.at(
        connection,
        {
          assessmentId,
          proctoredExamId: fakeProctoredExamId,
        },
      );
    },
  );
}
