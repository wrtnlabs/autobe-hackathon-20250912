import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportFailure";

/**
 * Validate an HR recruiter (the job initiator) can retrieve the details of an
 * export job failure by exportJobId and failureId.
 *
 * Covers:
 *
 * 1. Registering and authenticating the HR recruiter
 * 2. Creating a new export job
 * 3. Ensuring/simulating a failure for that job and fetching a valid failureId
 * 4. Retrieving the failure via GET, ensure fields are correct
 * 5. Fetching with a bogus failureId (expect error)
 * 6. Fetching as a different recruiter (expect denied)
 * 7. Fetching for unrelated job/failureId combinations (expect error)
 */
export async function test_api_export_job_failure_detail_access_by_hr_recruiter_with_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter & authenticate
  const recruiterData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: recruiterData,
    });
  typia.assert(recruiter);

  // 2. Create export job
  const exportJobData = {
    initiator_id: recruiter.id,
    job_type: RandomGenerator.name(1),
    delivery_method: RandomGenerator.pick([
      "download",
      "email",
      "object_storage_uri",
    ] as const),
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      { body: exportJobData },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "initiator_id should match recruiter",
    exportJob.initiator_id,
    recruiter.id,
  );

  // 3. Simulate failure: force a failure (in real E2E, ensure at least one failure exists for this export job)
  const failuresPage: IPageIAtsRecruitmentExportFailure =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {},
      },
    );
  typia.assert(failuresPage);
  const failure: IAtsRecruitmentExportFailure | undefined =
    failuresPage.data[0];
  TestValidator.predicate(
    "at least one failure exists",
    failuresPage.data.length > 0,
  );
  typia.assert(failure!);

  // 4. Retrieve failure via GET
  const fetchedFailure: IAtsRecruitmentExportFailure =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.at(
      connection,
      {
        exportJobId: exportJob.id,
        failureId: failure!.id,
      },
    );
  typia.assert(fetchedFailure);
  TestValidator.equals("failure id matches", fetchedFailure.id, failure!.id);
  TestValidator.equals(
    "export_job_id matches",
    fetchedFailure.export_job_id,
    exportJob.id,
  );

  // 5. Try non-existent failureId
  await TestValidator.error(
    "fetching non-existent failureId throws error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.at(
        connection,
        {
          exportJobId: exportJob.id,
          failureId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Register another recruiter + auth, try to access failure: should be denied
  const otherRecruiterJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const otherRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: otherRecruiterJoin,
    });
  typia.assert(otherRecruiter);

  await TestValidator.error(
    "unauthorized recruiter cannot view failure details",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.at(
        connection,
        {
          exportJobId: exportJob.id,
          failureId: failure!.id,
        },
      );
    },
  );

  // 7. Try unrelated job/failureId pairs
  // New export job with 2nd recruiter
  const exportJob2Data = {
    initiator_id: otherRecruiter.id,
    job_type: RandomGenerator.name(1),
    delivery_method: RandomGenerator.pick([
      "download",
      "email",
      "object_storage_uri",
    ] as const),
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob2: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      { body: exportJob2Data },
    );
  typia.assert(exportJob2);

  // Try fetching exportJob2's detail with failureId belonging to exportJob1
  await TestValidator.error(
    "unrelated job/failureId returns error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.at(
        connection,
        {
          exportJobId: exportJob2.id,
          failureId: failure!.id,
        },
      );
    },
  );
}
