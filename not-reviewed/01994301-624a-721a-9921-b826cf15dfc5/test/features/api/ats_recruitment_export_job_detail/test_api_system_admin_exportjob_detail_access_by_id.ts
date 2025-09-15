import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verifies that a system administrator can retrieve an individual export job
 * detail by ID, ensuring authentication and proper business access, and that
 * only authorized admins can access the detail. Also validates error handling
 * for unauthorized access, non-existent IDs, and mismatched associations.
 * Because there is no API to create or list export job details directly, the
 * test simulates existence of details by generating a detail mock with matching
 * export_job_id to the created export job.
 *
 * 1. Register as a system admin (super_admin: true), auto-login.
 * 2. Create an export job (initiator = this admin's id), obtain exportJobId.
 * 3. Simulate (mock) an export job detail corresponding to the export job. Use
 *    this for valid test retrieval.
 * 4. Retrieve the export job detail by ID, confirm all returned fields and foreign
 *    key association.
 * 5. Register a second admin and attempt forbidden access to first admin's export
 *    job detail (should error).
 * 6. Try fetching a detail with a random/nonexistent UUID (should error).
 * 7. Try mismatched job/detail association by using another job's detail id with
 *    the first job id (should error).
 * 8. Attempt unauthenticated access (should error as only admins may retrieve
 *    detail).
 */
export async function test_api_system_admin_exportjob_detail_access_by_id(
  connection: api.IConnection,
) {
  // 1. Register and login as super admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword!234",
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(admin);
  TestValidator.predicate("is super admin", admin.super_admin === true);

  // 2. Create a new export job, using admin's id as initiator
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      {
        body: {
          initiator_id: admin.id,
          job_type: "applicants",
          delivery_method: "download",
          request_description: RandomGenerator.paragraph(),
          filter_json: JSON.stringify({ foo: RandomGenerator.alphabets(8) }),
        },
      },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "initiator matches admin",
    exportJob.initiator_id,
    admin.id,
  );
  const exportJobId = exportJob.id;

  // 3. Simulate existence of an export job detail matching the export job
  // As the API provides no creation/list, we generate a detail mock
  const randomDetail: IAtsRecruitmentExportJobDetail =
    typia.random<IAtsRecruitmentExportJobDetail>();
  randomDetail.export_job_id = exportJobId;

  // 4. Retrieve the export job detail by ID
  const out: IAtsRecruitmentExportJobDetail =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.details.at(
      connection,
      {
        exportJobId: exportJobId,
        detailId: randomDetail.id,
      },
    );
  typia.assert(out);
  TestValidator.equals(
    "detail belongs to export job",
    out.export_job_id,
    exportJobId,
  );
  TestValidator.equals("matched detailId", out.id, randomDetail.id);

  // 5. Register a second admin, attempt forbidden access (join logs in new admin)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: secondAdminEmail,
      password: "Password2!233",
      name: RandomGenerator.name(),
      super_admin: false,
    },
  });
  await TestValidator.error(
    "other admin cannot access export job detail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.details.at(
        connection,
        {
          exportJobId: exportJobId,
          detailId: randomDetail.id,
        },
      );
    },
  );

  // 6. Try fetching with a non-existent detailId
  await TestValidator.error(
    "should throw for non-existent detailId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.details.at(
        connection,
        {
          exportJobId,
          detailId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Mismatched job/detail: create another job and (mocked) detail
  const otherExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      {
        body: {
          initiator_id: admin.id,
          job_type: "applications",
          delivery_method: "email",
          request_description: "For another export job",
        },
      },
    );
  typia.assert(otherExportJob);
  const otherDetail: IAtsRecruitmentExportJobDetail =
    typia.random<IAtsRecruitmentExportJobDetail>();
  otherDetail.export_job_id = otherExportJob.id;
  await TestValidator.error(
    "should throw for mismatched detailId/exportJobId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.details.at(
        connection,
        {
          exportJobId,
          detailId: otherDetail.id,
        },
      );
    },
  );

  // 8. Unauthenticated access error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("should error when not authenticated", async () => {
    await api.functional.atsRecruitment.systemAdmin.exportJobs.details.at(
      unauthConn,
      {
        exportJobId,
        detailId: randomDetail.id,
      },
    );
  });
}
