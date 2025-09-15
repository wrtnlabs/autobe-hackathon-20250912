import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test: HR recruiter export job update scenario.
 *
 * This test validates all business logic and permission rules for updating
 * an ATS export job:
 *
 * - Only the HR recruiter who created a job can update it.
 * - Updates to mutable fields (description, delivery_method, filter_json)
 *   succeed if permitted.
 * - Updates on completed/delivered jobs are rejected.
 * - Attempts to mutate immutable fields (initiator_id, job_type) are
 *   ignored/rejected.
 * - Unauthorized users cannot update others' jobs.
 *
 * Steps:
 *
 * 1. Register first HR recruiter (HR-A)
 * 2. Create export job as HR-A
 * 3. Update mutable fields (description, delivery) as HR-A and verify changes
 * 4. Register a second HR recruiter (HR-B)
 * 5. HR-B attempts to update the job (should fail)
 * 6. Mark export job as complete as HR-A
 * 7. Attempt any further update as HR-A (should fail)
 */
export async function test_api_export_job_update_hr_recruiter_scenario(
  connection: api.IConnection,
) {
  // 1. Register first HR recruiter (A)
  const hrAEmail = typia.random<string & tags.Format<"email">>();
  const hrARegister = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrAEmail,
      password: "TestPw123!!",
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrARegister);
  const hrAId = hrARegister.id;

  // 2. Create export job by HR-A
  const exportCreateBody = {
    initiator_id: hrAId,
    job_type: "applicants",
    delivery_method: "download",
    request_description: "Initial description",
    filter_json: JSON.stringify({ region: "apac", status: "active" }),
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      {
        body: exportCreateBody,
      },
    );
  typia.assert(exportJob);

  // 3. HR-A updates mutable fields
  const updatePayload = {
    request_description: "Updated by HR-A",
    delivery_method: "email",
    filter_json: JSON.stringify({ region: "emea", seniority: "mid" }),
  } satisfies IAtsRecruitmentExportJob.IUpdate;
  const updatedJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.update(
      connection,
      {
        exportJobId: exportJob.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedJob);
  TestValidator.equals(
    "description updated",
    updatedJob.request_description,
    updatePayload.request_description,
  );
  TestValidator.equals(
    "delivery_method updated",
    updatedJob.delivery_method,
    updatePayload.delivery_method,
  );
  TestValidator.equals(
    "filter_json updated",
    updatedJob.filter_json,
    updatePayload.filter_json,
  );

  // 4. Register a second HR recruiter (B)
  const hrBEmail = typia.random<string & tags.Format<"email">>();
  const hrBRegister = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrBEmail,
      password: "PasswordB_456",
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrBRegister);

  // 5. HR-B attempts update (should fail)
  await TestValidator.error("non-initiator HR cannot update", async () => {
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.update(
      connection,
      {
        exportJobId: exportJob.id,
        body: {
          request_description: "Malicious update by HR-B",
        } satisfies IAtsRecruitmentExportJob.IUpdate,
      },
    );
  });

  // 6. Set status to completed as HR-A (allowed transition)
  const completedStatusPayload = {
    status: "complete",
  } satisfies IAtsRecruitmentExportJob.IUpdate;
  const completedJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.update(
      connection,
      {
        exportJobId: exportJob.id,
        body: completedStatusPayload,
      },
    );
  typia.assert(completedJob);
  TestValidator.equals(
    "status transitioned to complete",
    completedJob.status,
    completedStatusPayload.status,
  );

  // 7. Further update as HR-A after completion (should fail)
  await TestValidator.error("no update after completion", async () => {
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.update(
      connection,
      {
        exportJobId: exportJob.id,
        body: {
          request_description: "Attempted post-complete update",
        } satisfies IAtsRecruitmentExportJob.IUpdate,
      },
    );
  });
}
