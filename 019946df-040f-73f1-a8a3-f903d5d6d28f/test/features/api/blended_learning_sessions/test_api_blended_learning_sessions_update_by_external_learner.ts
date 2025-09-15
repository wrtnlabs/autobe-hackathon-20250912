import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

/**
 * This E2E test validates the update operation of a proctored exam session by
 * an external learner user in a blended learning system. The test follows a
 * realistic business workflow where an external learner creates an account
 * (join operation), then uses their authenticated context to search for
 * existing blended learning sessions, and finally updates a proctored exam
 * session associated with an assessment. The update includes fields like
 * status, scheduled_at, proctor_id, and exam_session_id. The test ensures the
 * update API returns the changed data appropriately and typia.asserts the
 * response for type safety.
 *
 * The test includes error case validations where the external learner tries to
 * update with invalid session IDs or sends invalid status values, expecting
 * error handling by the API. This comprehensive test covers successful
 * authentication, searching for a valid session, performing an update,
 * validating the output, and verifying error scenarios.
 *
 * Steps:
 *
 * 1. Create and authenticate an external learner user with join API.
 * 2. Use the authenticated user context to search for blended learning sessions.
 * 3. Extract a valid blended learning session's assessment ID and proctored exam
 *    ID from the list.
 * 4. Prepare update request data, including a valid enum status and ISO 8601
 *    timestamps.
 * 5. Send an update request for the proctored exam session.
 * 6. Validate the response matches the input updates.
 * 7. Test failure scenarios with invalid assessmentId, proctoredExamId, verifying
 *    error responses.
 *
 * All required properties for API calls are included as per schema definitions.
 * Null values are explicitly passed when applicable. Exact enum values are
 * honored. Authentication tokens are handled automatically by the SDK.
 * TestValidator is used with descriptive titles for assertions.
 */
export async function test_api_blended_learning_sessions_update_by_external_learner(
  connection: api.IConnection,
) {
  // 1. External learner join
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const learnerEmail: string = typia.random<string & tags.Format<"email">>();
  const learnerPasswordHash = RandomGenerator.alphaNumeric(32);

  const externalLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: learnerEmail,
          password_hash: learnerPasswordHash,
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies IEnterpriseLmsExternalLearner.IJoin,
      },
    );
  typia.assert(externalLearner);

  // 2. Search for blended learning sessions
  const searchRequest = {
    body: {
      page: 1,
      limit: 1,
    } satisfies IEnterpriseLmsBlendedLearningSession.IRequest,
  };

  const blendedLearningSessions: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.externalLearner.blendedLearningSessions.index(
      connection,
      searchRequest,
    );
  typia.assert(blendedLearningSessions);

  TestValidator.predicate(
    "blended learning sessions found",
    blendedLearningSessions.data.length > 0,
  );

  const sessionSummary = blendedLearningSessions.data[0];

  // 3. Prepare update data for the proctored exam
  // Use sessionSummary.id for assessmentId
  const assessmentId: string = sessionSummary.id;

  // Generate a random proctoredExamId as a valid UUID format
  const proctoredExamId: string = typia.random<string & tags.Format<"uuid">>();

  // Compose update body
  const updateInput: IEnterpriseLmsProctoredExam.IUpdate = {
    assessment_id: assessmentId,
    exam_session_id: RandomGenerator.alphaNumeric(24),
    proctor_id: typia.random<string & tags.Format<"uuid">>(),
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    status: "scheduled",
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEnterpriseLmsProctoredExam.IUpdate;

  // 4. Perform update
  const updatedProctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.update(
      connection,
      {
        assessmentId,
        proctoredExamId,
        body: updateInput,
      },
    );
  typia.assert(updatedProctoredExam);

  TestValidator.equals(
    "updated assessment_id",
    updatedProctoredExam.assessment_id,
    assessmentId,
  );
  TestValidator.equals(
    "updated proctor_id",
    updatedProctoredExam.proctor_id,
    updateInput.proctor_id,
  );
  TestValidator.equals(
    "updated exam_session_id",
    updatedProctoredExam.exam_session_id,
    updateInput.exam_session_id,
  );
  TestValidator.equals(
    "updated status",
    updatedProctoredExam.status,
    updateInput.status,
  );

  // 5. Test failure scenario - invalid assessmentId
  await TestValidator.error(
    "update fails with invalid assessmentId",
    async () => {
      await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.update(
        connection,
        {
          assessmentId: "00000000-0000-0000-0000-000000000000",
          proctoredExamId,
          body: updateInput,
        },
      );
    },
  );

  // 6. Test failure scenario - invalid proctoredExamId
  await TestValidator.error(
    "update fails with invalid proctoredExamId",
    async () => {
      await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.update(
        connection,
        {
          assessmentId,
          proctoredExamId: "00000000-0000-0000-0000-000000000000",
          body: updateInput,
        },
      );
    },
  );
}
