import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Soft-delete a coding test record by marking the deleted_at field in
 * AtsRecruitmentCodingTest
 *
 * This endpoint allows HR recruiters to delete (soft delete) a coding test
 * previously assigned to an application. Instead of physically removing the row
 * from the database, the deleted_at timestamp is set, allowing for future audit
 * review, restore operations, or compliance checks.
 *
 * Only users with the hrRecruiter role are allowed to call this operation.
 * Attempting to delete a coding test that is already deleted or not in a
 * deletable state will result in an error. All delete attempts, both successful
 * and failed, are logged in audit trails with actor, time, and request
 * context.
 *
 * This is intended for business cases such as retracting an erroneously created
 * coding test or cleaning up abandoned/incomplete test records. Irreversible
 * permanent deletion of audit or application history is not allowed except
 * where required by law. Related operations include GET (detail/search), PUT
 * (update), and PATCH (listing).
 *
 * @param props - The request properties.
 * @param props.hrRecruiter - The authenticated HR recruiter (must own the
 *   coding test).
 * @param props.codingTestId - Unique identifier of the coding test to delete
 *   (soft-delete).
 * @returns Void
 * @throws {Error} If coding test is not found, already deleted, or not owned by
 *   HR recruiter.
 */
export async function deleteatsRecruitmentHrRecruiterCodingTestsCodingTestId(props: {
  hrRecruiter: HrrecruiterPayload;
  codingTestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiter, codingTestId } = props;

  // Fetch the coding test to verify deletion eligibility and ownership
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        deleted_at: null,
      },
    });
  if (!codingTest) {
    throw new Error("Coding test not found or already deleted");
  }

  if (codingTest.ats_recruitment_hrrecruiter_id !== hrRecruiter.id) {
    throw new Error(
      "Unauthorized: Only the HR recruiter who created this coding test can delete it.",
    );
  }

  // Soft delete: set deleted_at and updated_at
  const timestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_coding_tests.update({
    where: { id: codingTestId },
    data: {
      deleted_at: timestamp,
      updated_at: timestamp,
    },
  });

  // Write audit log
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: timestamp,
      actor_id: hrRecruiter.id,
      actor_role: "hrRecruiter",
      operation_type: "DELETE",
      target_type: "ats_recruitment_coding_tests",
      target_id: codingTestId,
      event_detail: "Soft delete coding test",
      ip_address: undefined,
      user_agent: undefined,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    },
  });
}
