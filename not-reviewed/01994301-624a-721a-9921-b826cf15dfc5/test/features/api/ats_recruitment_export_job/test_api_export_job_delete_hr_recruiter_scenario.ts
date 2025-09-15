import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify HR recruiter permissions and business rules for deleting export jobs.
 *
 * Test steps:
 *
 * 1. Register HR recruiter A (initiator) and HR recruiter B (non-initiator)
 * 2. HR A creates a new export job
 * 3. HR A deletes the job (should succeed)
 * 4. HR B tries to delete already deleted job (should fail)
 * 5. Try deleting with a random non-existent exportJobId (should fail)
 */
export async function test_api_export_job_delete_hr_recruiter_scenario(
  connection: api.IConnection,
) {
  // 1. HR recruiter A (initiator)
  const emailA = typia.random<string & tags.Format<"email">>();
  const joinA = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: emailA,
      password: "test123!@#",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinA);

  // 2. HR recruiter B (non-initiator)
  const emailB = typia.random<string & tags.Format<"email">>();
  const joinB = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: emailB,
      password: "testabc$%*",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinB);

  // 3. HR A creates an export job
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: emailA,
      password: "test123!@#",
      name: joinA.name,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  const job = await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
    connection,
    {
      body: {
        initiator_id: joinA.id,
        job_type: "applicants",
        delivery_method: "download",
        request_description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IAtsRecruitmentExportJob.ICreate,
    },
  );
  typia.assert(job);

  // 4. HR A deletes the job
  await api.functional.atsRecruitment.hrRecruiter.exportJobs.erase(connection, {
    exportJobId: job.id,
  });

  // 5. HR B tries to delete already deleted job (should fail)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: emailB,
      password: "testabc$%*",
      name: joinB.name,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  await TestValidator.error(
    "HR B cannot delete already deleted export job",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.erase(
        connection,
        {
          exportJobId: job.id,
        },
      );
    },
  );

  // 6. Non-existent exportJobId
  const randomFakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent exportJobId should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.erase(
        connection,
        {
          exportJobId: randomFakeId,
        },
      );
    },
  );
}
