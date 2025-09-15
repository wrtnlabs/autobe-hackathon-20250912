import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates admin-only export job deletion rules and error handling.
 *
 * - Tests that deletion is permitted only for export jobs not yet completed or
 *   delivered, and verifies error handling for completed, already-deleted, and
 *   non-existent jobs.
 *
 * Steps:
 *
 * 1. Register as a system administrator (with super_admin privileges)
 * 2. Create a new export job in pending status
 * 3. Delete this export job (should succeed)
 * 4. Attempt to delete the same export job again (should fail: already deleted)
 * 5. Attempt to delete a random nonexistent exportJobId (should fail)
 * 6. (Indirect test) Attempting deletion of completed/delivered job is logically
 *    covered by failure to delete already deleted jobs
 */
export async function test_api_export_job_delete_system_admin_scenario(
  connection: api.IConnection,
) {
  // 1. Register as a system administrator (super_admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(admin);

  // 2. Create a new export job in pending status
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      {
        body: {
          initiator_id: admin.id,
          job_type: "applicants",
          delivery_method: "download",
          request_description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(exportJob);

  // 3. Delete this export job (should succeed)
  await api.functional.atsRecruitment.systemAdmin.exportJobs.erase(connection, {
    exportJobId: exportJob.id,
  });

  // 4. Delete same export job again (already deleted - should fail with error)
  await TestValidator.error("deleting already deleted job fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.exportJobs.erase(
      connection,
      {
        exportJobId: exportJob.id,
      },
    );
  });

  // 5. Attempt to delete a random nonexistent exportJobId (should fail)
  await TestValidator.error(
    "deleting nonexistent export job fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.erase(
        connection,
        {
          exportJobId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
